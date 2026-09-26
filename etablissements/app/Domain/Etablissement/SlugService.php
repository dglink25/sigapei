<?php

namespace App\Domain\Etablissement;

use Illuminate\Support\Str;

/**
 * Genere le slug d'un etablissement a la validation (section 2.2) :
 * minuscules, sans accents, espaces/caracteres speciaux remplaces par des
 * tirets ; en cas de collision, suffixe numerique incremental.
 * Modifiable uniquement par le Super Administrateur une fois genere.
 */
class SlugService
{
    public function genererDepuisNom(string $nom): string
    {
        $base = Str::slug($nom);
        $slug = $base;
        $suffixe = 2;

        while (Etablissement::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffixe}";
            $suffixe++;
        }

        return $slug;
    }
}
