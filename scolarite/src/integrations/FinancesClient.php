<?php

namespace App\integrations;

use App\common\Services\InterneClient;
use Throwable;

/**
 * Client d'intégration avec le microservice Finances.
 *
 * Règle n°4 du CDC (section 4.4 du README scolarité) : cette fonction est
 * STRICTEMENT EN LECTURE SEULE. Aucun reçu, aucune facture et aucune
 * transaction n'est émise ni modifiée depuis Scolarité.
 *
 * Règle n°1 : plus de lecture directe du schéma `finances`. La vue
 * consolidée est récupérée via l'API interne de Finances.
 */
class FinancesClient
{
    public function __construct(
        protected InterneClient $interne
    ) {}

    /**
     * Récupère la vue consolidée des paiements de scolarité d'un apprenant.
     *
     * @return array<string, mixed>
     */
    public function obtenirSituationFinanciere(string $apprenantUuid, int $tenantId): array
    {
        try {
            $reponse = $this->interne->get('finances', '/v1/interne/apprenants/paiements', [
                'apprenant_uuid' => $apprenantUuid,
                'tenant_id'      => $tenantId,
            ]);
        } catch (Throwable $e) {
            return $this->situationIndisponible($e->getMessage());
        }

        if (!$reponse) {
            return $this->situationIndisponible('Aucune facture émise pour cet apprenant.');
        }

        $donnees = $reponse['donnees'] ?? $reponse;

        return [
            'total_du'        => (float) ($donnees['total_du'] ?? 0),
            'total_regle'     => (float) ($donnees['total_regle'] ?? 0),
            'solde_restant'   => (float) ($donnees['solde_restant'] ?? 0),
            'statut_global'   => $donnees['statut_global'] ?? 'NON_DEFINI',
            'nombre_factures' => (int) ($donnees['nombre_factures'] ?? 0),
            'factures'        => (array) ($donnees['factures'] ?? []),
        ];
    }

    /**
     * Situation neutre lorsque le module Finances est indisponible.
     */
    private function situationIndisponible(string $raison): array
    {
        return [
            'total_du'        => 0.0,
            'total_regle'     => 0.0,
            'solde_restant'   => 0.0,
            'statut_global'   => 'NON_DEFINI',
            'nombre_factures' => 0,
            'factures'        => [],
            'remarque'        => 'Module Finances indisponible ou non initialisé : ' . $raison,
        ];
    }
}
