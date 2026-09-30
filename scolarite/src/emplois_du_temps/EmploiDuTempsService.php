<?php

namespace App\emplois_du_temps;

use App\classes\Classe;
use App\common\Services\AuditService;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class EmploiDuTempsService
{
    public function __construct(
        protected EmploiDuTempsRepository $repository
    ) {}

    public function lister(array $filtres = []): Collection
    {
        return $this->repository->lister($filtres);
    }

    public function creerOuModifier(array $donnees): EmploiDuTemps
    {
        // Resoudre la classe via uuid
        if (!empty($donnees['classe_uuid'])) {
            $classe = Classe::where('uuid', $donnees['classe_uuid'])->first();
            if (!$classe) {
                throw new Exception("Classe specifiee introuvable.");
            }
            $donnees['classe_id'] = $classe->id;
            unset($donnees['classe_uuid']);
        }

        $creneau = $this->repository->creerOuModifier($donnees);

        AuditService::journaliser('GESTION_EMPLOI_DU_TEMPS', "Creneau {$creneau->jour} {$creneau->heure_debut}-{$creneau->heure_fin}", [
            'classe_id' => $creneau->classe_id,
            'salle' => $creneau->salle,
        ]);

        return $creneau;
    }
}
