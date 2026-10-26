<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Outils sur les noms de lieux.
 *
 *  - nettoyer() : retire le decor administratif que certaines sources ajoutent autour
 *    du nom, en francais ("Departement de l'Atlantique" -> "Atlantique", "Commune de
 *    Ouidah" -> "Ouidah", "Arrondissement d'Akassato" -> "Akassato") comme en anglais
 *    ("Commune of Ouidah" -> "Ouidah", "Atakora Department" -> "Atakora").
 *    Volontairement prudent : "District of Columbia", "Western Province" ou
 *    "Orange County" restent intacts, ce sont de vrais noms.
 *  - cle() : cle de comparaison insensible a la casse, aux accents, aux tirets, au
 *    decor administratif et a la variante k/c ("Atakora" = "Atacora", "Kouffo" = "Couffo"),
 *    pour reconnaitre qu'un meme lieu est ecrit differemment. Ne sert qu'a comparer des
 *    lieux freres (meme parent), jamais a afficher un nom.
 */
class NormalisationNom
{
    private const MOTIF_PREFIXE = "/^(?:d[ée]partement|commune|arrondissement|pr[ée]fecture|sous-pr[ée]fecture|r[ée]gion|province|district|cercle|village|quartier)\s+(?:de la |de l['’]|de |du |des |d['’])/iu";

    private const MOTIF_PREFIXE_EN = "/^(?:commune|arrondissement|department|prefecture|sub-prefecture)\s+of\s+/iu";

    private const MOTIF_SUFFIXE_EN = "/\s+(?:department|departement)$/iu";

    public static function nettoyer(string $nom): string
    {
        $nom = trim(preg_replace('/\s+/u', ' ', $nom) ?? $nom);

        $nettoye = preg_replace(self::MOTIF_PREFIXE, '', $nom) ?? $nom;
        $nettoye = preg_replace(self::MOTIF_PREFIXE_EN, '', $nettoye) ?? $nettoye;
        $nettoye = preg_replace(self::MOTIF_SUFFIXE_EN, '', $nettoye) ?? $nettoye;
        $nettoye = trim($nettoye);

        return $nettoye !== '' ? $nettoye : $nom;
    }

    public static function cle(string $nom): string
    {
        $ascii = strtolower(Str::ascii(self::nettoyer($nom)));

        return preg_replace('/[^a-z0-9]/', '', str_replace('k', 'c', $ascii)) ?? '';
    }
}
