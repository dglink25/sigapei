<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use Illuminate\Support\Facades\DB;

/** Situation financière d'un apprenant et rapports de l'établissement (calculés sur les factures et règlements). */
class Soldes
{
    /** Solde d'un apprenant : total facturé, réglé, reste, montant échu impayé (échéances passées non couvertes). */
    public function apprenant(string $apprenantUuid): array
    {
        $etab = Contexte::etablissement();

        $f = DB::selectOne(
            "SELECT COALESCE(SUM(montant_total), 0)::bigint AS total, COALESCE(SUM(montant_regle), 0)::bigint AS regle, count(*)::int AS nombre
               FROM finances.factures WHERE etablissement_uuid = ? AND apprenant_uuid = ? AND statut <> 'annulee'",
            [$etab, $apprenantUuid],
        );
        $echu = $this->echuImpaye($etab, $apprenantUuid);

        return [
            'apprenant_uuid' => $apprenantUuid,
            'devise' => app(Parametres::class)->lire()['devise'],
            'nombre_factures' => (int) $f->nombre,
            'total_facture' => (int) $f->total,
            'total_regle' => (int) $f->regle,
            'reste_a_payer' => (int) $f->total - (int) $f->regle,
            'montant_echu_impaye' => $echu['montant'],
            'en_retard_depuis' => $echu['depuis'],
            'a_jour' => $echu['montant'] === 0,
        ];
    }

    /** Factures non annulées d'un apprenant (vue famille et vue consolidée pour Scolarité), plus récentes d'abord. */
    public function factures(string $apprenantUuid): array
    {
        return DB::select(
            "SELECT f.uuid::text AS uuid, f.numero, f.libelle, f.annee_scolaire, f.montant_total, f.montant_regle, f.statut,
                    (SELECT min(e.date_echeance)::text FROM finances.echeances e WHERE e.facture_id = f.id
                      AND (SELECT COALESCE(SUM(e2.montant), 0) FROM finances.echeances e2 WHERE e2.facture_id = f.id AND e2.rang <= e.rang) > f.montant_regle) AS prochaine_echeance
               FROM finances.factures f
              WHERE f.etablissement_uuid = ? AND f.apprenant_uuid = ? AND f.statut <> 'annulee'
              ORDER BY f.created_at DESC, f.id DESC LIMIT 100",
            [Contexte::etablissement(), $apprenantUuid],
        );
    }

    /**
     * Pour chaque facture : échéances cumulées jusqu'à aujourd'hui - montant réglé (affecté aux échéances dans
     * l'ordre). Renvoie le total échu impayé et la date de la plus ancienne échéance non couverte.
     */
    private function echuImpaye(string $etab, string $apprenantUuid): array
    {
        $lignes = DB::select(
            "SELECT f.id, f.montant_regle, e.date_echeance::text AS date_echeance, e.montant
               FROM finances.factures f JOIN finances.echeances e ON e.facture_id = f.id
              WHERE f.etablissement_uuid = ? AND f.apprenant_uuid = ? AND f.statut IN ('emise','partiellement_reglee')
                AND e.date_echeance <= CURRENT_DATE
              ORDER BY f.id, e.rang",
            [$etab, $apprenantUuid],
        );

        $montant = 0;
        $depuis = null;
        $cumul = [];
        foreach ($lignes as $l) {
            $cumul[$l->id] = ($cumul[$l->id] ?? 0) + (int) $l->montant;
            $impaye = min((int) $l->montant, max(0, $cumul[$l->id] - (int) $l->montant_regle));
            if ($impaye > 0) {
                $montant += $impaye;
                $depuis = $depuis === null || $l->date_echeance < $depuis ? $l->date_echeance : $depuis;
            }
        }

        return ['montant' => $montant, 'depuis' => $depuis];
    }

    /** Synthèse sur une période : encaissé (par mode, par jour), émis, impayés, en attente de validation. */
    public function synthese(string $du, string $au): array
    {
        $etab = Contexte::etablissement();
        $parMode = DB::select(
            "SELECT mode, COALESCE(SUM(montant), 0)::bigint AS montant, count(*) FILTER (WHERE montant > 0)::int AS nombre
               FROM finances.reglements WHERE etablissement_uuid = ? AND statut = 'valide' AND date_reglement BETWEEN ? AND ?
              GROUP BY mode ORDER BY mode",
            [$etab, $du, $au],
        );
        $parJour = DB::select(
            "SELECT date_reglement::text AS jour, SUM(montant)::bigint AS montant
               FROM finances.reglements WHERE etablissement_uuid = ? AND statut = 'valide' AND date_reglement BETWEEN ? AND ?
              GROUP BY date_reglement ORDER BY date_reglement",
            [$etab, $du, $au],
        );
        $emis = DB::selectOne(
            "SELECT count(*)::int AS nombre, COALESCE(SUM(montant_total), 0)::bigint AS montant
               FROM finances.factures WHERE etablissement_uuid = ? AND statut <> 'annulee' AND created_at::date BETWEEN ? AND ?",
            [$etab, $du, $au],
        );
        $global = DB::selectOne(
            "SELECT COALESCE(SUM(montant_total), 0)::bigint AS facture, COALESCE(SUM(montant_regle), 0)::bigint AS regle,
                    count(*) FILTER (WHERE statut IN ('emise','partiellement_reglee'))::int AS ouvertes
               FROM finances.factures WHERE etablissement_uuid = ? AND statut <> 'annulee'",
            [$etab],
        );
        $echus = DB::selectOne(
            "SELECT count(DISTINCT f.apprenant_uuid)::int AS apprenants
               FROM finances.factures f
              WHERE f.etablissement_uuid = ? AND f.statut IN ('emise','partiellement_reglee')
                AND (SELECT COALESCE(SUM(e.montant), 0) FROM finances.echeances e WHERE e.facture_id = f.id AND e.date_echeance <= CURRENT_DATE) > f.montant_regle",
            [$etab],
        );
        $attente = DB::selectOne(
            "SELECT count(*)::int AS nombre, COALESCE(SUM(montant), 0)::bigint AS montant FROM finances.reglements WHERE etablissement_uuid = ? AND statut = 'a_valider'",
            [$etab],
        );

        $total = (int) $global->facture;

        return [
            'periode' => ['du' => $du, 'au' => $au],
            'devise' => app(Parametres::class)->lire()['devise'],
            'encaisse' => [
                'total' => array_sum(array_map(fn ($m) => (int) $m->montant, $parMode)),
                'par_mode' => array_map(fn ($m) => ['mode' => $m->mode, 'montant' => (int) $m->montant, 'nombre' => (int) $m->nombre], $parMode),
                'par_jour' => array_map(fn ($j) => ['jour' => $j->jour, 'montant' => (int) $j->montant], $parJour),
            ],
            'factures_emises' => ['nombre' => (int) $emis->nombre, 'montant' => (int) $emis->montant],
            'situation' => [
                'total_facture' => $total,
                'total_regle' => (int) $global->regle,
                'reste_a_recouvrer' => $total - (int) $global->regle,
                'taux_recouvrement' => $total > 0 ? round(100 * (int) $global->regle / $total, 1) : null,
                'factures_ouvertes' => (int) $global->ouvertes,
                'apprenants_en_retard' => (int) $echus->apprenants,
            ],
            'reglements_a_valider' => ['nombre' => (int) $attente->nombre, 'montant' => (int) $attente->montant],
        ];
    }
}
