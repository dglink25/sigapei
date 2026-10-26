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
 *  - resoudre()                 : tolerant, utilise pendant la saisie (brouillon partiel) ;
 *  - exigerComplete()           : strict mais adapte a la profondeur du referentiel, utilise a la soumission et a la validation ;
 *  - exigerCompleteDepuisIds()  : meme regle sur des ids bruts (modification du profil d'un etablissement).
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
     * Exige une localisation exploitable, adaptee a la profondeur du referentiel :
     * le pays est toujours obligatoire, puis chaque niveau (departement, commune,
     * arrondissement) l'est tant que le referentiel en propose pour le niveau choisi.
     * Un pays sans subdivision connue n'exige donc que le pays ; une commune sans
     * arrondissement connu n'exige pas d'arrondissement. L'adresse est toujours obligatoire.
     */
    public function exigerComplete(DemandeEtablissement $demande): void
    {
        $this->exigerCompleteDepuisIds(
            $demande->pays_id,
            $demande->departement_id,
            $demande->commune_id,
            $demande->arrondissement_id,
            $demande->adresse_complete,
        );
    }

    public function exigerCompleteDepuisIds(?int $paysId, ?int $departementId, ?int $communeId, ?int $arrondissementId, ?string $adresse): void
    {
        $erreurs = [];

        if (! $paysId) {
            $erreurs['localisation.pays_uuid'] = ['Le pays est obligatoire.'];
        } elseif (! $departementId && Departement::where('pays_id', $paysId)->exists()) {
            $erreurs['localisation.departement_uuid'] = ['Le département / la région est obligatoire pour ce pays.'];
        } elseif ($departementId && ! $communeId && Commune::where('departement_id', $departementId)->exists()) {
            $erreurs['localisation.commune_uuid'] = ['La commune / la ville est obligatoire pour ce département.'];
        } elseif ($communeId && ! $arrondissementId && Arrondissement::where('commune_id', $communeId)->exists()) {
            $erreurs['localisation.arrondissement_uuid'] = ["L'arrondissement est obligatoire pour cette commune."];
        }

        if (blank($adresse)) {
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
