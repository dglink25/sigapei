<?php

namespace App\Domain\Geo;

use App\Domain\Onboarding\DemandeEtablissement;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Resout et controle la localisation declaree a l'etape 2 (pays, departement,
 * commune, arrondissement) : verifie que chaque uuid existe, que les niveaux
 * sont coherents entre eux (une commune appartient bien au departement choisi,
 * etc.) et complete automatiquement les niveaux superieurs.
 *
 *  - resoudre()          : tolerant, utilise pendant la saisie (brouillon partiel) ;
 *  - exigerComplete()    : strict, utilise a la soumission et a la validation.
 */
class LocalisationService
{
    /**
     * @param  array<string, mixed>  $localisation  section "localisation" du formulaire
     * @return array{pays_id: ?int, departement_id: ?int, commune_id: ?int, arrondissement_id: ?int}
     */
    public function resoudre(array $localisation): array
    {
        $pays = $this->charger(Pays::class, $localisation['pays_uuid'] ?? null, 'pays_uuid');
        $departement = $this->charger(Departement::class, $localisation['departement_uuid'] ?? null, 'departement_uuid');
        $commune = $this->charger(Commune::class, $localisation['commune_uuid'] ?? null, 'commune_uuid');
        $arrondissement = $this->charger(Arrondissement::class, $localisation['arrondissement_uuid'] ?? null, 'arrondissement_uuid');

        // Completion vers le haut : le niveau le plus fin fait foi.
        if ($arrondissement) {
            $this->exigerCoherence($commune, $arrondissement->commune_id, 'commune_uuid');
            $commune ??= Commune::find($arrondissement->commune_id);
        }
        if ($commune) {
            $this->exigerCoherence($departement, $commune->departement_id, 'departement_uuid');
            $departement ??= Departement::find($commune->departement_id);
        }
        if ($departement) {
            $this->exigerCoherence($pays, $departement->pays_id, 'pays_uuid');
            $pays ??= Pays::find($departement->pays_id);
        }

        return [
            'pays_id' => $pays?->id,
            'departement_id' => $departement?->id,
            'commune_id' => $commune?->id,
            'arrondissement_id' => $arrondissement?->id,
        ];
    }

    /**
     * Exige une localisation exploitable : pays, departement et commune
     * renseignes, adresse presente, et arrondissement choisi des lors que la
     * commune en possede dans le referentiel.
     */
    public function exigerComplete(DemandeEtablissement $demande): void
    {
        $erreurs = [];

        if (! $demande->pays_id) {
            $erreurs['localisation.pays_uuid'] = ['Le pays est obligatoire.'];
        }
        if (! $demande->departement_id) {
            $erreurs['localisation.departement_uuid'] = ['Le département / la région est obligatoire.'];
        }
        if (! $demande->commune_id) {
            $erreurs['localisation.commune_uuid'] = ['La commune / la ville est obligatoire.'];
        } elseif (! $demande->arrondissement_id && Arrondissement::where('commune_id', $demande->commune_id)->exists()) {
            $erreurs['localisation.arrondissement_uuid'] = ["L'arrondissement est obligatoire pour cette commune."];
        }
        if (blank($demande->adresse_complete)) {
            $erreurs['localisation.adresse_complete'] = ["L'adresse complète est obligatoire."];
        }

        if ($erreurs) {
            throw ValidationException::withMessages($erreurs);
        }
    }

    private function charger(string $modele, mixed $uuid, string $champ): mixed
    {
        if ($uuid === null || $uuid === '') {
            return null;
        }

        if (! is_string($uuid) || ! Str::isUuid($uuid)) {
            throw ValidationException::withMessages(["localisation.{$champ}" => ["Identifiant invalide pour {$champ}."]]);
        }

        $element = $modele::where('uuid', $uuid)->first();

        if (! $element) {
            throw ValidationException::withMessages(["localisation.{$champ}" => ["Aucun élément géographique ne correspond à {$champ}."]]);
        }

        return $element;
    }

    private function exigerCoherence(mixed $declare, int|string $idAttendu, string $champ): void
    {
        if ($declare && (int) $declare->id !== (int) $idAttendu) {
            throw ValidationException::withMessages([
                "localisation.{$champ}" => ["Incohérence géographique : {$champ} ne correspond pas au niveau inférieur choisi."],
            ]);
        }
    }
}
