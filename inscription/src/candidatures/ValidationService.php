<?php

namespace App\candidatures;

use App\common\Services\AuditService;
use App\common\Services\TenantResolver;
use App\integrations\EtablissementsClient;
use App\integrations\IdentiteClient;
use App\integrations\ScolariteClient;
use Exception;
use Illuminate\Support\Facades\DB;

class ValidationService
{
    public function __construct(
        protected CandidatureRepository $repository,
        protected ScolariteClient $scolariteClient,
        protected EtablissementsClient $etablissementsClient,
        protected IdentiteClient $identiteClient
    ) {}

    /**
     * Valide définitivement une candidature :
     *
     * 1. Vérifie que le module 'inscription' est actif pour l'établissement (tenant)
     * 2. Vérifie la disponibilité de place dans la classe visée (UUID-based)
     * 3. Recherche si le parent a déjà un compte SSO dans identite (par email/tél)
     * 4. Crée l'apprenant dans scolarite.apprenants (règle du programme pédagogique)
     * 5. Passe le statut de la candidature à 'validee'
     *
     * Le JWT identite fournit :
     *   - sub      → UUID de l'administrateur qui valide
     *   - tenantId → UUID de l'établissement
     *   - roleCode → doit être 'administrateur' ou 'super_admin' (garanti par VerifyRole)
     */
    public function validerCandidature(string $candidatureUuid): array
    {
        $candidature = $this->repository->trouverParUuid($candidatureUuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        if ($candidature->statut === 'validee') {
            throw new Exception("Cette candidature a déjà été validée.");
        }

        if ($candidature->statut === 'rejetee') {
            throw new Exception("Impossible de valider une candidature précédemment rejetée.");
        }

        // 1. Vérification module établissement.
        // Le tenant est déjà résolu en entier par le middleware ; on le résout
        // à nouveau si le service est appelé hors du cycle HTTP (console, test).
        try {
            $tenantId = app(TenantResolver::class)->resoudreCourant();
        } catch (\Throwable $e) {
            throw new Exception(
                "Validation impossible : établissement de rattachement introuvable. " . $e->getMessage(),
                0,
                $e
            );
        }

        if (!$this->etablissementsClient->estModuleActif($tenantId, 'inscription')) {
            throw new Exception("Le module 'Inscription' n'est pas actif pour cet établissement.");
        }

        // 2. Vérification disponibilité — la classe visée est référencée par son id
        // ou son uuid selon la candidature. Le tenant est transmis tel quel :
        // ScolariteClient refuse explicitement une valeur non numérique.
        $classeRef = $candidature->classe_visee_uuid ?? $candidature->classe_visee_id;
        $dispo = $this->scolariteClient->verifierDisponibilite($classeRef, $tenantId);

        if ($dispo['est_complete']) {
            throw new Exception("Validation impossible : la classe '{$dispo['nom']}' a atteint sa capacité maximale ({$dispo['capacite']} places).");
        }

        // 3. Recherche du compte parent dans identite
        $parentCompte = $this->identiteClient->trouverUtilisateurParContact(
            $candidature->parent_email,
            $candidature->parent_telephone
        );
        $parentIdentiteId = $parentCompte?->id ?? null;

        return DB::transaction(function () use ($candidature, $dispo, $tenantId, $parentIdentiteId) {
            // 4. Création de l'apprenant dans scolarite
            $apprenant = $this->scolariteClient->creerApprenant([
                'tenant_id'          => $tenantId,
                'classe_uuid'        => $dispo['uuid'],
                'candidature_id'     => $candidature->id,
                'parent_identite_id' => $parentIdentiteId,
                'nom'                => $candidature->nom,
                'prenom'             => $candidature->prenom,
                'date_naissance'     => $candidature->date_naissance->format('Y-m-d'),
                'sexe'               => $candidature->sexe,
                'parent_lien'        => $candidature->parent_lien,
                // utilisateur_identite_id = null ici ; sera renseigné si programme français secondaire
                // par l'administrateur lors d'un transfert ultérieur ou via le module SSO
            ]);

            // 5. Passage du statut à 'validee'
            $candidature->statut = 'validee';
            $candidature->save();

            // 6. Audit
            AuditService::journaliser(
                'VALIDATION_CANDIDATURE',
                "Candidature {$candidature->nom} {$candidature->prenom} validee pour la classe {$dispo['nom']}",
                [
                    'candidature_uuid'     => $candidature->uuid,
                    'apprenant_uuid'       => $apprenant['uuid'],
                    'classe_nom'           => $dispo['nom'],
                    'programme'            => $dispo['programme'],
                    'parent_lie'           => ($parentIdentiteId !== null),
                    'compte_utilisateur'   => $apprenant['compte_utilisateur_cree'],
                ]
            );

            return [
                'candidature_uuid' => $candidature->uuid,
                'statut'           => 'validee',
                'apprenant'        => [
                    'uuid'                  => $apprenant['uuid'],
                    'classe'                => $dispo['nom'],
                    'programme'             => $dispo['programme'],
                    'parent_lie'            => ($parentIdentiteId !== null),
                    'compte_utilisateur_cree' => $apprenant['compte_utilisateur_cree'],
                ],
                'message' => 'Candidature validée avec succès et apprenant généré dans la scolarité.',
            ];
        });
    }

    /**
     * Rejette une candidature avec un motif obligatoire.
     */
    public function rejeterCandidature(string $candidatureUuid, string $motif): array
    {
        $candidature = $this->repository->trouverParUuid($candidatureUuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        if ($candidature->statut === 'validee') {
            throw new Exception("Une candidature validée ne peut plus être rejetée.");
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
            'statut'           => 'rejetee',
            'motif_rejet'      => $motif,
            'message'          => 'Candidature rejetée avec motif enregistré.',
        ];
    }
}
