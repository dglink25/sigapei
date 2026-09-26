<?php

namespace App\candidatures;

use App\common\Services\AuditService;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class CandidatureService
{
    public function __construct(
        protected CandidatureRepository $repository,
        protected ValidationService $validationService
    ) {}

    public function listerCandidatures(array $filtres = []): Collection
    {
        return $this->repository->lister($filtres);
    }

    public function soumettreCandidature(array $donnees): Candidature
    {
        $donnees['statut'] = 'soumise';
        $donnees['date_soumission'] = now();

        $candidature = $this->repository->creer($donnees);

        AuditService::journaliser(
            'SOUMISSION_CANDIDATURE',
            "Nouvelle candidature pour {$candidature->nom} {$candidature->prenom}",
            ['uuid' => $candidature->uuid, 'classe_visee_id' => $candidature->classe_visee_id]
        );

        return $candidature;
    }

    public function consulterDetail(string $uuid): array
    {
        $candidature = $this->repository->trouverParUuid($uuid);
        if (!$candidature) {
            throw new Exception("Candidature introuvable.");
        }

        return [
            'uuid' => $candidature->uuid,
            'nom' => $candidature->nom,
            'prenom' => $candidature->prenom,
            'date_naissance' => $candidature->date_naissance?->format('Y-m-d'),
            'sexe' => $candidature->sexe,
            'email' => $candidature->email,
            'telephone' => $candidature->telephone,
            'adresse' => $candidature->adresse,
            'statut' => $candidature->statut,
            'classe_visee_id' => $candidature->classe_visee_id,
            'date_soumission' => $candidature->date_soumission?->toIso8601String(),
            'motif_rejet' => $candidature->motif_rejet,
            'parent' => [
                'nom' => $candidature->parent_nom,
                'prenom' => $candidature->parent_prenom,
                'telephone' => $candidature->parent_telephone,
                'email' => $candidature->parent_email,
                'lien' => $candidature->parent_lien,
            ],
            'pieces_justificatives' => $candidature->piecesJustificatives->map(fn($p) => [
                'uuid' => $p->uuid,
                'type' => $p->type,
                'nom_original' => $p->nom_original,
                'chemin_stockage' => $p->chemin_stockage,
                'statut_validation' => $p->statut_validation,
            ]),
            'tests_admission' => $candidature->testsAdmission->map(fn($t) => [
                'uuid' => $t->uuid,
                'type_test' => $t->type_test,
                'matiere' => $t->matiere,
                'note' => $t->note,
                'note_max' => $t->note_max,
                'resultat' => $t->resultat,
            ]),
        ];
    }

    public function valider(string $uuid): array
    {
        return $this->validationService->validerCandidature($uuid);
    }

    public function rejeter(string $uuid, string $motif): array
    {
        return $this->validationService->rejeterCandidature($uuid, $motif);
    }
}
