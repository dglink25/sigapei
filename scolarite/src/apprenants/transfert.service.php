<?php

namespace App\apprenants;

use App\classes\Classe;
use App\common\Services\AuditService;
use Exception;
use Illuminate\Support\Facades\DB;

class TransfertService
{
    public function __construct(
        protected ApprenantRepository $repository
    ) {}

    /**
     * Effectue un transfert ou une mutation interne vers une autre classe
     * sans jamais dupliquer le dossier apprenant.
     */
    public function executerTransfert(string $apprenantUuid, string $nouvelleClasseUuid, ?string $motif = null, ?int $effectueParId = null): array
    {
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
            throw new Exception("L'apprenant est deja inscrit dans cette classe.");
        }

        // Verification bloquante de la disponibilite de place
        $placesRestantes = $nouvelleClasse->places_disponibles;
        if ($placesRestantes <= 0) {
            throw new Exception("Transfert impossible : la classe de destination ({$nouvelleClasse->nom}) est complete.");
        }

        return DB::transaction(function () use ($apprenant, $ancienneClasse, $nouvelleClasse, $motif, $effectueParId) {
            // 1. Enregistrement dans l'historique des classes
            $historique = HistoriqueClasse::create([
                'tenant_id' => $apprenant->tenant_id,
                'apprenant_id' => $apprenant->id,
                'ancienne_classe_id' => $ancienneClasse->id,
                'nouvelle_classe_id' => $nouvelleClasse->id,
                'motif' => $motif ?? 'Transfert interne standard',
                'effectue_par_utilisateur_id' => $effectueParId,
            ]);

            // 2. Gestion de la regle specifique de programme pedagogique (Beninois -> Francais)
            $changementProgramme = false;
            $compteApresTransfertRequis = false;

            if ($ancienneClasse->programme === 'beninois' && $nouvelleClasse->programme === 'francais') {
                $changementProgramme = true;
                // Si la nouvelle classe est en secondaire et qu'aucun compte n'existe encore
                if ($nouvelleClasse->cycle === 'secondaire' && empty($apprenant->utilisateur_id)) {
                    $compteApresTransfertRequis = true;
                }
            }

            // 3. Mise a jour de la classe de l'apprenant dans la meme fiche
            $apprenant->classe_id = $nouvelleClasse->id;
            $apprenant->save();

            // 4. Journalisation dans l'audit_log
            AuditService::journaliser(
                'TRANSFERT_CLASSE',
                "Apprenant {$apprenant->nom} {$apprenant->prenom} transfere de {$ancienneClasse->nom} vers {$nouvelleClasse->nom}",
                [
                    'apprenant_uuid' => $apprenant->uuid,
                    'ancienne_classe' => $ancienneClasse->nom,
                    'nouvelle_classe' => $nouvelleClasse->nom,
                    'changement_programme' => $changementProgramme,
                    'compte_requis' => $compteApresTransfertRequis,
                    'motif' => $motif
                ]
            );

            return [
                'apprenant_uuid' => $apprenant->uuid,
                'nom' => $apprenant->nom,
                'prenom' => $apprenant->prenom,
                'ancienne_classe' => [
                    'uuid' => $ancienneClasse->uuid,
                    'nom' => $ancienneClasse->nom,
                    'programme' => $ancienneClasse->programme,
                ],
                'nouvelle_classe' => [
                    'uuid' => $nouvelleClasse->uuid,
                    'nom' => $nouvelleClasse->nom,
                    'programme' => $nouvelleClasse->programme,
                ],
                'date_transfert' => $historique->date_transfert->toIso8601String(),
                'changement_programme' => $changementProgramme,
                'compte_apprenant_a_creer' => $compteApresTransfertRequis,
                'message' => 'Transfert effectue avec succes sans duplication du dossier.',
            ];
        });
    }
}
