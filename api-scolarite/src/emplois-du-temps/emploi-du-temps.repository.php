<?php

namespace App\emplois_du_temps;

use Illuminate\Database\Eloquent\Collection;

class EmploiDuTempsRepository
{
    public function lister(array $filtres = []): Collection
    {
        $query = EmploiDuTemps::query()->with('classe');

        if (!empty($filtres['classe_uuid'])) {
            $query->whereHas('classe', function ($q) use ($filtres) {
                $q->where('uuid', $filtres['classe_uuid']);
            });
        }

        if (!empty($filtres['enseignant_id'])) {
            $query->where('enseignant_id', $filtres['enseignant_id']);
        }

        if (!empty($filtres['jour'])) {
            $query->where('jour', $filtres['jour']);
        }

        return $query->orderBy('jour')->orderBy('heure_debut')->get();
    }

    public function creerOuModifier(array $donnees): EmploiDuTemps
    {
        if (!empty($donnees['uuid'])) {
            $creneau = EmploiDuTemps::where('uuid', $donnees['uuid'])->first();
            if ($creneau) {
                $creneau->update($donnees);
                return $creneau;
            }
        }

        return EmploiDuTemps::create($donnees);
    }
}
