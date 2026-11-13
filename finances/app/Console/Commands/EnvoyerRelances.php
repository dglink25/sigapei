<?php

namespace App\Console\Commands;

use App\Common\Tenant\Contexte;
use App\Integrations\RabbitMqPublisher;
use App\Services\Parametres;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Relances d'échéances (CDC §5) selon les paliers de l'établissement : N jours avant l'échéance, puis
 * aux jours de retard choisis. Une échéance n'est relancée que si elle n'est pas couverte par les règlements
 * (affectés aux échéances dans l'ordre), et une seule fois par palier (contrainte unique en base).
 * Finances publie `finances.relance.due` ; la notification (WhatsApp, e-mail) est faite par le service dédié.
 * Palier : -N = N jours avant l'échéance, +N = N jours de retard.
 */
class EnvoyerRelances extends Command
{
    protected $signature = 'finances:relances';

    protected $description = 'Publie les relances d\'échéances dues aujourd\'hui';

    public function handle(Parametres $parametres, RabbitMqPublisher $evenements): int
    {
        $etabs = DB::table('finances.factures')->whereIn('statut', ['emise', 'partiellement_reglee'])
            ->distinct()->orderBy('etablissement_uuid')->pluck('etablissement_uuid');

        $total = 0;
        foreach ($etabs as $etab) {
            try {
                $total += Contexte::executerPour((string) $etab, fn () => $this->etablissement((string) $etab, $parametres->lire(), $evenements));
            } catch (Throwable $e) {
                Log::error('[RELANCES] '.$e->getMessage(), ['etablissement' => $etab]);
            }
        }
        $this->info("{$total} relance(s) publiée(s).");

        return self::SUCCESS;
    }

    private function etablissement(string $etab, array $p, RabbitMqPublisher $evenements): int
    {
        $paliers = [];
        if ($p['relance_jours_avant'] > 0) {
            $paliers[-$p['relance_jours_avant']] = now()->addDays($p['relance_jours_avant'])->toDateString();
        }
        foreach ($p['relance_jours_apres'] as $n) {
            $paliers[$n] = now()->subDays($n)->toDateString();
        }
        if ($paliers === []) {
            return 0;
        }

        $n = 0;
        foreach ($paliers as $palier => $date) {
            $echeances = DB::select(
                "SELECT e.id, e.montant, e.libelle, f.uuid::text AS facture_uuid, f.numero, f.apprenant_uuid::text AS apprenant_uuid,
                        LEAST(e.montant, (SELECT SUM(e2.montant) FROM finances.echeances e2 WHERE e2.facture_id = f.id AND e2.rang <= e.rang) - f.montant_regle) AS du
                   FROM finances.echeances e JOIN finances.factures f ON f.id = e.facture_id
                  WHERE f.etablissement_uuid = ? AND f.statut IN ('emise','partiellement_reglee') AND e.date_echeance = ?
                    AND (SELECT SUM(e2.montant) FROM finances.echeances e2 WHERE e2.facture_id = f.id AND e2.rang <= e.rang) > f.montant_regle",
                [$etab, $date],
            );
            foreach ($echeances as $e) {
                $insere = DB::table('finances.relances')->insertOrIgnore(['echeance_id' => $e->id, 'palier' => $palier]);
                if ($insere === 0) {
                    continue;
                }
                $evenements->publier('finances.relance.due', [
                    'etablissement_uuid' => $etab,
                    'apprenant_uuid' => $e->apprenant_uuid,
                    'facture_uuid' => $e->facture_uuid,
                    'facture_numero' => $e->numero,
                    'echeance' => $e->libelle,
                    'date_echeance' => $date,
                    'montant_du' => (int) $e->du,
                    'jours' => $palier,
                    'devise' => $p['devise'],
                ]);
                $n++;
            }
        }

        return $n;
    }
}
