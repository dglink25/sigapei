<?php

namespace App\classes;

use Illuminate\Database\Eloquent\Collection;

class ClasseRepository
{
    public function lister(array $filtres = []): Collection
    {
        $query = Classe::query();

        if (!empty($filtres['cycle'])) {
            $query->where('cycle', $filtres['cycle']);
        }

        if (!empty($filtres['programme'])) {
            $query->where('programme', $filtres['programme']);
        }

        if (!empty($filtres['statut'])) {
            $query->where('statut', $filtres['statut']);
        } else {
            $query->where('statut', 'actif');
        }

        return $query->withCount(['apprenants'])->get();
    }

    public function trouverParUuid(string $uuid): ?Classe
    {
        return Classe::where('uuid', $uuid)->first();
    }

    public function trouverParId(int $id): ?Classe
    {
        return Classe::find($id);
    }

    public function creer(array $donnees): Classe
    {
        return Classe::create($donnees);
    }

    public function mettreAJour(Classe $classe, array $donnees): Classe
    {
        $classe->update($donnees);
        return $classe;
    }
}
