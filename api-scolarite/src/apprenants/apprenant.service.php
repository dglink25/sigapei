<?php

namespace App\apprenants;

use App\integrations\FinancesClient;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class ApprenantService
{
    public function __construct(
        protected ApprenantRepository $repository,
        protected TransfertService $transfertService,
        protected FinancesClient $financesClient
    ) {}

    public function listerApprenants(array $filtres = []): Collection
    {
        return $this->repository->lister($filtres);
    }

    public function consulterDossier(string $uuid): array
    {
        $apprenant = $this->repository->trouverParUuid($uuid);
        if (!$apprenant) {
            throw new Exception("Dossier apprenant introuvable.");
        }

        $historique = $apprenant->historiqueClasses->map(fn(HistoriqueClasse $h) => [
            'uuid' => $h->uuid,
            'ancienne_classe' => $h->ancienneClasse?->nom ?? 'Inconnue',
            'nouvelle_classe' => $h->nouvelleClasse?->nom ?? 'Inconnue',
            'date_transfert' => $h->date_transfert?->toIso8601String(),
            'motif' => $h->motif,
        ]);

        $parents = $apprenant->parents->map(fn(ParentApprenant $p) => [
            'parent_id' => $p->parent_id,
            'lien_parente' => $p->lien_parente,
            'est_responsable_legal' => $p->est_responsable_legal,
            'est_contact_urgence' => $p->est_contact_urgence,
        ]);

        return [
            'uuid' => $apprenant->uuid,
            'matricule' => $apprenant->matricule,
            'nom' => $apprenant->nom,
            'prenom' => $apprenant->prenom,
            'date_naissance' => $apprenant->date_naissance?->format('Y-m-d'),
            'sexe' => $apprenant->sexe,
            'statut' => $apprenant->statut,
            'classe' => [
                'uuid' => $apprenant->classe?->uuid,
                'nom' => $apprenant->classe?->nom,
                'cycle' => $apprenant->classe?->cycle,
                'niveau' => $apprenant->classe?->niveau,
                'programme' => $apprenant->classe?->programme,
            ],
            'compte_utilisateur_actif' => !empty($apprenant->utilisateur_id),
            'historique_classes' => $historique,
            'parents' => $parents,
        ];
    }

    public function transferer(string $apprenantUuid, string $nouvelleClasseUuid, ?string $motif = null, ?int $effectueParId = null): array
    {
        return $this->transfertService->executerTransfert($apprenantUuid, $nouvelleClasseUuid, $motif, $effectueParId);
    }

    public function consulterPaiements(string $uuid): array
    {
        $apprenant = $this->repository->trouverParUuid($uuid);
        if (!$apprenant) {
            throw new Exception("Dossier apprenant introuvable.");
        }

        $situation = $this->financesClient->obtenirSituationFinanciere($apprenant->id, $apprenant->tenant_id);

        return [
            'apprenant' => [
                'uuid' => $apprenant->uuid,
                'nom' => $apprenant->nom,
                'prenom' => $apprenant->prenom,
                'classe' => $apprenant->classe?->nom,
            ],
            'situation_financiere' => $situation,
        ];
    }

    public function obtenirInfoInterne(string $uuid): array
    {
        $apprenant = $this->repository->trouverParUuid($uuid);
        if (!$apprenant) {
            throw new Exception("Apprenant introuvable.");
        }

        return [
            'uuid' => $apprenant->uuid,
            'nom' => $apprenant->nom,
            'prenom' => $apprenant->prenom,
            'statut' => $apprenant->statut,
            'classe_nom' => $apprenant->classe?->nom,
            'cycle' => $apprenant->classe?->cycle,
            'programme' => $apprenant->classe?->programme,
        ];
    }
}
