<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Outils sur les noms de lieux.
 *
 *  - nettoyer() : retire le prefixe administratif francais que certaines sources
 *    ajoutent devant le nom ("Departement de l'Atlantique" -> "Atlantique",
 *    "Commune de Ouidah" -> "Ouidah", "Arrondissement d'Akassato" -> "Akassato").
 *  - cle() : cle de comparaison insensible a la casse, aux accents, aux tirets et
 *    aux prefixes, pour reconnaitre qu'un meme lieu est ecrit differemment
 *    ("Sèmè-Podji" et "Commune de Seme Podji" donnent la meme cle).
 */
class NormalisationNom
{
    private const MOTIF_PREFIXE = "/^(?:d[ée]partement|commune|arrondissement|pr[ée]fecture|sous-pr[ée]fecture|r[ée]gion|province|district|cercle|village|quartier)\s+(?:de la |de l['’]|de |du |des |d['’])/iu";

    public static function nettoyer(string $nom): string
    {
        $nom = trim(preg_replace('/\s+/u', ' ', $nom) ?? $nom);
        $nettoye = trim(preg_replace(self::MOTIF_PREFIXE, '', $nom) ?? $nom);

        return $nettoye !== '' ? $nettoye : $nom;
    }

    public static function cle(string $nom): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower(Str::ascii(self::nettoyer($nom)))) ?? '';
    }
}
