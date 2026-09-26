<?php

namespace App\candidatures;

use App\common\Services\AuditService;
use App\integrations\EtablissementsClient;
use App\integrations\ScolariteClient;
use Exception;
use Illuminate\Support\Facades\DB;

class ValidationService
{
    public function __construct(
        protected CandidatureRepository $repository,
        protected ScolariteClient $scolariteClient,
        protected EtablissementsClient $etablissementsClient
    ) {}

    /**
     * Valide definitivement une candidature :
     * 1. Verifie le module actif
     * 2. Verifie la disponibilite de place
     * 3. Cree l'apprenant dans scolarite.apprenants (selon la regle du programme)
     * 4. Passe le statut a 'validee'
     */
    public function validerCandidature(string $candidatureUuid): array
    {
        $candidature = $this->repository->trouverParUuid($candidatureUuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        if ($candidature->statut === 'validee') {
            throw new Exception("Cette candidature a deja ete validee.");
        }

        if ($candidature->statut === 'rejetee') {
            throw new Exception("Impossible de valider une candidature precedemment rejetee.");
        }

        // 1. Verification d'activation du module inscription pour l'etablissement
        if (!$this->etablissementsClient->estModuleActif($candidature->tenant_id, 'inscription')) {
            throw new Exception("Le module 'Inscription' n'est pas actif pour cet etablissement.");
        }

        // 2. Verification bloquante de la disponibilite de place dans la classe visee
        $dispo = $this->scolariteClient->verifierDisponibilite($candidature->classe_visee_id, $candidature->tenant_id);
        if ($dispo['est_complete']) {
            throw new Exception("Validation impossible : la classe '{$dispo['nom']}' a atteint sa capacite maximale ({$dispo['capacite']} places).");
        }

        return DB::transaction(function () use ($candidature, $dispo) {
            // 3. Creation de l'apprenant dans le schema scolarite
            $apprenant = $this->scolariteClient->creerApprenant([
                'tenant_id' => $candidature->tenant_id,
                'classe_id' => $candidature->classe_visee_id,
                'candidature_id' => $candidature->id,
                'nom' => $candidature->nom,
                'prenom' => $candidature->prenom,
                'date_naissance' => $candidature->date_naissance->format('Y-m-d'),
                'sexe' => $candidature->sexe,
                'parent_lien' => $candidature->parent_lien,
            ]);

            // 4. Passage du statut a 'validee'
            $candidature->statut = 'validee';
            $candidature->save();

            // 5. Journalisation dans l'audit_log
            AuditService::journaliser(
                'VALIDATION_CANDIDATURE',
                "Candidature {$candidature->nom} {$candidature->prenom} validee pour la classe {$dispo['nom']}",
                [
                    'candidature_uuid' => $candidature->uuid,
                    'apprenant_uuid' => $apprenant['uuid'],
                    'classe_nom' => $dispo['nom'],
                    'programme' => $dispo['programme'],
                    'compte_utilisateur_actif' => $apprenant['compte_utilisateur_cree'],
                ]
            );

            return [
                'candidature_uuid' => $candidature->uuid,
                'statut' => 'validee',
                'apprenant' => [
                    'uuid' => $apprenant['uuid'],
                    'classe' => $dispo['nom'],
                    'programme' => $dispo['programme'],
                    'compte_utilisateur_cree' => $apprenant['compte_utilisateur_cree'],
                ],
                'message' => 'Candidature validee avec succes et apprenant genere dans la scolarite.',
            ];
        });
    }

    /**
     * Rejette une candidature avec un motif obligatoire
     */
    public function rejeterCandidature(string $candidatureUuid, string $motif): array
    {
        $candidature = $this->repository->trouverParUuid($candidatureUuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        if ($candidature->statut === 'validee') {
            throw new Exception("Une candidature validee ne peut plus etre rejetee.");
        }

        $candidature->statut = 'rejetee';
        $candidature->motif_rejet = $motif;
        $candidature->save();

        AuditService::journaliser(
            'REJET_CANDIDATURE',
            "Candidature {$candidature->nom} {$candidature->prenom} rejetee",
            ['candidature_uuid' => $candidature->uuid, 'motif' => $motif]
        );

        return [
            'candidature_uuid' => $candidature->uuid,
            'statut' => 'rejetee',
            'motif_rejet' => $motif,
            'message' => 'Candidature rejetee avec motif enregistre.',
        ];
    }
}
