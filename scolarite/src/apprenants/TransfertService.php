<?php

namespace App\apprenants;

use App\classes\Classe;
use App\common\Services\AuditService;
use App\integrations\IdentiteClient;
use Exception;
use Illuminate\Support\Facades\DB;

class TransfertService
{
    public function __construct(
        protected ApprenantRepository $repository,
        protected IdentiteClient $identiteClient
    ) {}

    /**
     * Effectue un transfert ou une mutation interne vers une autre classe.
     * Gère aussi le cas de changement de programme (béninois → français secondaire)
     * qui nécessite de noter que le compte identite doit être créé ultérieurement.
     *
     * @param string|null $effectueParUuid UUID du directeur (champ `sub` du JWT identite)
     */
    public function executerTransfert(
        string $apprenantUuid,
        string $nouvelleClasseUuid,
        ?string $motif = null,
        ?string $effectueParUuid = null
    ): array {
        $apprenant = $this->repository->trouverParUuid($apprenantUuid);
        if (!$apprenant) {
            throw new Exception("Apprenant introuvable.");
        }

        $ancienneClasse = $apprenant->classe;
        $nouvelleClasse = Classe::where('uuid', $nouvelleClasseUuid)->first();

        if (!$nouvelleClasse) {
            throw new Exception("Classe de destination introuvable.");
        }

        if ($ancienneClasse->id === $nouvelleClasse->id) {
            throw new Exception("L'apprenant est déjà inscrit dans cette classe.");
        }

        // Vérification bloquante de la disponibilité de place
        $inscrits = $nouvelleClasse->apprenants()->where('statut', 'actif')->count();
        $placesRestantes = max(0, $nouvelleClasse->capacite - $inscrits);
        if ($placesRestantes <= 0) {
            throw new Exception("Transfert impossible : la classe de destination ({$nouvelleClasse->nom}) est complète.");
        }

        // Résoudre l'ID interne du directeur depuis identite si UUID fourni
        $effectueParId = null;
        if ($effectueParUuid) {
            $directeur = $this->identiteClient->trouverParUuid($effectueParUuid);
            $effectueParId = $directeur?->id;
        }

        return DB::transaction(function () use ($apprenant, $ancienneClasse, $nouvelleClasse, $motif, $effectueParId) {
            $maintenant = now();

            // 1. Historique
            $historique = HistoriqueClasse::create([
                'tenant_id'                   => $apprenant->tenant_id,
                'apprenant_id'                => $apprenant->id,
                'ancienne_classe_id'          => $ancienneClasse->id,
                'nouvelle_classe_id'          => $nouvelleClasse->id,
                'motif'                       => $motif ?? 'Transfert interne standard',
                'date_transfert'              => $maintenant,
                'effectue_par_utilisateur_id' => $effectueParId,
            ]);

            // 2. Détection changement de programme
            $changementProgramme = ($ancienneClasse->programme === 'beninois' && $nouvelleClasse->programme === 'francais');
            $compteRequis = $changementProgramme
                && $nouvelleClasse->cycle === 'secondaire'
                && empty($apprenant->utilisateur_id);

            // 3. Mise à jour classe de l'apprenant
            $apprenant->classe_id = $nouvelleClasse->id;
            $apprenant->save();

            // 4. Audit
            AuditService::journaliser(
                'TRANSFERT_CLASSE',
                "Apprenant {$apprenant->nom} {$apprenant->prenom} transfere de {$ancienneClasse->nom} vers {$nouvelleClasse->nom}",
                [
                    'apprenant_uuid'         => $apprenant->uuid,
                    'ancienne_classe'        => $ancienneClasse->nom,
                    'nouvelle_classe'        => $nouvelleClasse->nom,
                    'changement_programme'   => $changementProgramme,
                    'compte_identite_requis' => $compteRequis,
                    'motif'                  => $motif,
                    'effectue_par_id'        => $effectueParId,
                ]
            );

            return [
                'apprenant_uuid' => $apprenant->uuid,
                'nom'            => $apprenant->nom,
                'prenom'         => $apprenant->prenom,
                'ancienne_classe' => [
                    'uuid'      => $ancienneClasse->uuid,
                    'nom'       => $ancienneClasse->nom,
                    'programme' => $ancienneClasse->programme,
                ],
                'nouvelle_classe' => [
                    'uuid'      => $nouvelleClasse->uuid,
                    'nom'       => $nouvelleClasse->nom,
                    'programme' => $nouvelleClasse->programme,
                ],
                'date_transfert'          => $maintenant->toIso8601String(),
                'changement_programme'    => $changementProgramme,
                'compte_identite_a_creer' => $compteRequis,
                'message'                 => 'Transfert effectué avec succès sans duplication du dossier.',
            ];
        });
    }
}
