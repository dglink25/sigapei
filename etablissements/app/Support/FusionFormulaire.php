<?php

namespace App\Support;

/**
 * Fusion des donnees du formulaire d'onboarding avec un brouillon existant.
 *
 * Contrairement a array_replace_recursive(), les LISTES sont remplacees en
 * bloc : avec array_replace_recursive, passer types de ['primaire','secondaire']
 * a ['secondaire'] donnait ['secondaire','secondaire'] (l'ancien 2e element
 * survivait). Seuls les tableaux associatifs (sections, champs) sont fusionnes.
 */
class FusionFormulaire
{
    public static function fusionner(array $base, array $ajout): array
    {
        foreach ($ajout as $cle => $valeur) {
            if (is_array($valeur) && ! array_is_list($valeur) && isset($base[$cle]) && is_array($base[$cle])) {
                $base[$cle] = self::fusionner($base[$cle], $valeur);
            } else {
                $base[$cle] = $valeur;
            }
        }

        return $base;
    }
}
