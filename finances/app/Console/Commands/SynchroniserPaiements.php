<?php

namespace App\Console\Commands;

use App\Common\Tenant\Contexte;
use App\Http\Controllers\InterneController;
use App\Models\PaiementEnLigne;
use App\Services\PaiementsEnLigne;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Filet de sécurité si une notification de Paiement se perd : relit chez Paiement
 *  - les paiements en cours (initie, en_attente) des dernières 48 h ;
 *  - une fois par jour, les paiements acquis des 90 derniers jours (remboursement éventuel).
 */
class SynchroniserPaiements extends Command
{
    protected $signature = 'finances:synchroniser-paiements {--limite=200}';

    protected $description = 'Relit chez Paiement l\'état des paiements en ligne non finalisés';

    public function handle(PaiementsEnLigne $service): int
    {
        $limite = max(1, min(1000, (int) $this->option('limite')));
        $liste = PaiementEnLigne::withoutGlobalScopes()->whereNotNull('encaissement_uuid')
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->whereIn('statut', ['initie', 'en_attente'])->where('created_at', '>', now()->subHours(48)))
                ->orWhere(fn ($q) => $q->whereIn('statut', ['approuve', 'disponible', 'rembourse_partiel'])
                    ->where('created_at', '>', now()->subDays(90))->where('derniere_synchro', '<', now()->subDay())))
            ->orderBy('derniere_synchro')->limit($limite)->get();

        $erreurs = 0;
        foreach ($liste as $p) {
            $etab = (string) $p->etablissement_uuid;
            try {
                Contexte::executerPour($etab, fn () => $service->synchroniser(PaiementEnLigne::whereKey($p->id)->firstOrFail()),
                    InterneController::SYSTEME + ['etablissement' => $etab]);
            } catch (Throwable $e) {
                $erreurs++;
                Log::warning('[SYNCHRO_PAIEMENT] '.$e->getMessage(), ['paiement' => $p->uuid]);
            }
        }
        $this->info(count($liste).' paiement(s) relu(s), '.$erreurs.' en erreur.');

        return self::SUCCESS;
    }
}
