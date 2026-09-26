<?php

namespace App\apprenants;

use Illuminate\Database\Eloquent\Collection;

class ApprenantRepository
{
    public function lister(array $filtres = []): Collection
    {
        $query = Apprenant::query()->with(['classe']);

        if (!empty($filtres['classe_id'])) {
            $query->where('classe_id', $filtres['classe_id']);
        }

        if (!empty($filtres['statut'])) {
            $query->where('statut', $filtres['statut']);
        } else {
            $query->where('statut', 'actif');
        }

        if (!empty($filtres['recherche'])) {
            $r = $filtres['recherche'];
            $query->where(function ($q) use ($r) {
                $q->where('nom', 'ILIKE', "%{$r}%")
                  ->orWhere('prenom', 'ILIKE', "%{$r}%")
                  ->orWhere('matricule', 'ILIKE', "%{$r}%");
            });
        }

        return $query->get();
    }

    public function trouverParUuid(string $uuid): ?Apprenant
    {
        return Apprenant::where('uuid', $uuid)
            ->with(['classe', 'historiqueClasses.ancienneClasse', 'historiqueClasses.nouvelleClasse', 'parents'])
            ->first();
    }

    public function trouverParId(int $id): ?Apprenant
    {
        return Apprenant::find($id);
    }

    public function creer(array $donnees): Apprenant
    {
        return Apprenant::create($donnees);
    }

    public function mettreAJour(Apprenant $apprenant, array $donnees): Apprenant
    {
        $apprenant->update($donnees);
        return $apprenant;
    }
}
