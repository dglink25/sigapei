<?php

namespace App\reinscriptions;

use App\common\Services\AuditService;
use App\common\Services\InterneClient;
use App\common\Services\TenantResolver;
use App\integrations\ScolariteClient;
use Exception;
use Illuminate\Support\Facades\DB;

/**
 * Reconduction d'un apprenant existant sur une nouvelle année scolaire.
 *
 * Règle n°1 : aucune écriture directe dans le schéma `scolarite`. La
 * réinscription est une mutation du dossier apprenant, qui appartient à
 * Scolarité. Elle est donc demandée via l'API interne de Scolarité, qui
 * reste le seul propriétaire du dossier et de son historique.
 *
 * Ce service ne conserve qu'une trace de la demande dans son propre
 * schéma `inscription.reinscriptions`.
 */
class ReinscriptionService
{
    public function __construct(
        protected ScolariteClient $scolariteClient,
        protected InterneClient $interne
    ) {}

    /**
     * @param  array<string, mixed>  $donnees
     * @return array<string, mixed>
     */
    public function reconduireApprenant(array $donnees): array
    {
        try {
            $tenantId = app(TenantResolver::class)->resoudreCourant();
        } catch (\Throwable $e) {
            throw new Exception(
                "Réinscription impossible : établissement de rattachement introuvable. " . $e->getMessage(),
                0,
                $e
            );
        }

        $apprenantUuid = $donnees['apprenant_uuid'] ?? null;
        $nouvelleClasseUuid = $donnees['nouvelle_classe_uuid'] ?? null;

        if (empty($apprenantUuid)) {
            throw new Exception("L'UUID de l'apprenant est requis pour une réinscription.");
        }

        if (empty($nouvelleClasseUuid)) {
            throw new Exception("L'UUID de la nouvelle classe est requis pour une réinscription.");
        }

        // 1. Vérifier la disponibilité via l'API interne de Scolarité
        $dispo = $this->scolariteClient->verifierDisponibilite($nouvelleClasseUuid, $tenantId);

        // 2. Demander la mutation du dossier à Scolarité, seule propriétaire
        //    de `scolarite.apprenants` et `scolarite.historique_classes`.
        //    Le dossier n'est jamais dupliqué : Scolarité ne fait qu'adapter
        //    la classe existante et journaliser l'historique.
        $resultat = $this->interne->post('scolarite', '/v1/interne/apprenants/transfert', [
            'apprenant_uuid'       => $apprenantUuid,
            'nouvelle_classe_uuid' => $nouvelleClasseUuid,
            'motif'               => "Réinscription pour l'année scolaire {$donnees['annee_scolaire']}",
        ]);

        $transfert = $resultat['donnees'] ?? $resultat;

        // 3. Tracer la demande dans le schéma inscription (propriété propre)
        $reinscription = Reinscription::create([
            'tenant_id'      => $tenantId,
            'apprenant_id'   => $donnees['apprenant_id'] ?? null,
            'annee_scolaire' => $donnees['annee_scolaire'],
            'statut'         => 'validee',
            'date_demande'   => now(),
        ]);

        AuditService::journaliser(
            'REINSCRIPTION_APPRENANT',
            "Apprenant {$apprenantUuid} réinscrit en classe {$dispo['nom']}",
            [
                'annee_scolaire'  => $donnees['annee_scolaire'],
                'apprenant_uuid'  => $apprenantUuid,
                'nouvelle_classe' => $dispo['nom'],
            ]
        );

        return [
            'uuid'            => $reinscription->uuid,
            'apprenant_uuid'  => $apprenantUuid,
            'nouvelle_classe' => $dispo['nom'],
            'annee_scolaire'  => $donnees['annee_scolaire'],
            'statut'          => 'validee',
            'changement_programme' => (bool) ($transfert['changement_programme'] ?? false),
            'message'         => 'Dossier apprenant reconduit avec succès sur la nouvelle année scolaire sans duplication.',
        ];
    }
}
