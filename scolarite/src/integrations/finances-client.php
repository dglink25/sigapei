<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Throwable;

class FinancesClient
{
    /**
     * Recupere la vue consolidee des paiements de scolarite d'un apprenant
     * par lecture directe sur les tables finances.factures et finances.transactions.
     * STRICTEMENT EN LECTURE SEULE.
     */
    public function obtenirSituationFinanciere(int $apprenantId, int $tenantId): array
    {
        try {
            // Lecture des factures
            $factures = DB::table('finances.factures')
                ->where('tenant_id', $tenantId)
                ->where('apprenant_id', $apprenantId)
                ->orderBy('echeance', 'asc')
                ->get();

            // Lecture des transactions de paiement associees
            $transactions = DB::table('finances.transactions')
                ->where('tenant_id', $tenantId)
                ->whereIn('facture_id', $factures->pluck('id')->toArray())
                ->where('sens', 'ENTRANT')
                ->where('statut', 'confirme')
                ->get();

            $totalDu = $factures->sum('montant');
            $totalPaye = $transactions->sum('montant');
            $soldeRestant = max(0, $totalDu - $totalPaye);

            return [
                'total_du' => (float) $totalDu,
                'total_regle' => (float) $totalPaye,
                'solde_restant' => (float) $soldeRestant,
                'statut_global' => ($soldeRestant <= 0) ? 'A_JOUR' : 'EN_RETARD',
                'nombre_factures' => $factures->count(),
                'factures' => $factures->map(fn($f) => [
                    'id' => $f->id,
                    'montant' => (float) $f->montant,
                    'echeance' => $f->echeance ?? null,
                    'statut' => $f->statut ?? 'en_attente',
                ])->toArray(),
            ];
        } catch (Throwable $e) {
            // Si la table finances n'est pas encore migree dans l'environnement local de dev
            return [
                'total_du' => 0.0,
                'total_regle' => 0.0,
                'solde_restant' => 0.0,
                'statut_global' => 'NON_DEFINI',
                'nombre_factures' => 0,
                'factures' => [],
                'remarque' => 'Module Finances non initialise ou aucune facture emise pour cet apprenant.',
            ];
        }
    }
}
