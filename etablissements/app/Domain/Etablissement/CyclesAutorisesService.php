<?php

namespace App\Domain\Etablissement;

/**
 * Derive la liste des cycles activables (Maternelle, Primaire, Secondaire,
 * Universitaire) a partir des types demandes a l'etape 1 (section 8.2) :
 * Primaire -> Maternelle + Primaire ; Secondaire -> Secondaire ;
 * Universite -> Universitaire.
 */
class CyclesAutorisesService
{
    public function deriverDepuisTypes(array $types): array
    {
        $cycles = [];

        if (in_array('primaire', $types, true)) {
            $cycles[] = 'maternelle';
            $cycles[] = 'primaire';
        }
        if (in_array('secondaire', $types, true)) {
            $cycles[] = 'secondaire';
        }
        if (in_array('universite', $types, true)) {
            $cycles[] = 'universitaire';
        }

        return array_values(array_unique($cycles));
    }

    public function creerPour(Etablissement $etablissement, array $types): void
    {
        foreach ($this->deriverDepuisTypes($types) as $cycle) {
            $etablissement->cyclesAutorises()->firstOrCreate(['cycle' => $cycle], ['statut' => 'actif']);
        }
    }
}
