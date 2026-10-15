<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Arithmétique décimale exacte sur entiers (aucun float dans le calcul des notes).
 *
 * Toute valeur est représentée par un entier mis à l'échelle 10^4 (4 décimales internes) :
 * "13.5" => 135000. Les notes (2 décimales) et coefficients (2 décimales) y tiennent exactement,
 * et les produits restent très en dessous de PHP_INT_MAX (9,2·10^18) pour des barèmes scolaires.
 * Arrondi : au plus proche, demi vers le haut (12,345 -> 12,35), uniquement sur valeurs positives.
 */
final class Decimal
{
    public const ECHELLE = 10_000;

    private const DECIMALES_INTERNES = 4;

    /** "13.25" | "13" | 13 => entier à l'échelle 10^4. Refuse les floats (imprécis) et plus de 4 décimales. */
    public static function versEchelle(string|int $valeur): int
    {
        if (is_int($valeur)) {
            return $valeur * self::ECHELLE;
        }

        $valeur = trim($valeur);
        if (! preg_match('/^(-?)(\d{1,12})(?:\.(\d{1,4}))?$/', $valeur, $m)) {
            throw new InvalidArgumentException("Valeur décimale invalide : « {$valeur} ».");
        }

        $entier = (int) $m[2] * self::ECHELLE + (int) str_pad($m[3] ?? '', self::DECIMALES_INTERNES, '0');

        return $m[1] === '-' ? -$entier : $entier;
    }

    /** Division arrondie au plus proche (demi vers le haut) ; numérateur >= 0, dénominateur > 0. */
    public static function diviserArrondi(int $numerateur, int $denominateur): int
    {
        if ($denominateur <= 0 || $numerateur < 0) {
            throw new InvalidArgumentException('Division décimale hors domaine.');
        }

        return intdiv(2 * $numerateur + $denominateur, 2 * $denominateur);
    }

    /** Multiplie deux valeurs à l'échelle et ramène le résultat à l'échelle (arrondi). */
    public static function multiplier(int $a, int $b): int
    {
        return self::diviserArrondi($a * $b, self::ECHELLE);
    }

    /** Arrondit une valeur à l'échelle à $decimales (0 à 4), résultat toujours à l'échelle 10^4. */
    public static function arrondir(int $valeur, int $decimales): int
    {
        if ($decimales < 0 || $decimales > self::DECIMALES_INTERNES) {
            throw new InvalidArgumentException('Nombre de décimales hors limites (0 à 4).');
        }

        $pas = 10 ** (self::DECIMALES_INTERNES - $decimales);

        return self::diviserArrondi($valeur, $pas) * $pas;
    }

    /** Valeur à l'échelle => chaîne à $decimales chiffres après le point ("13.50"). */
    public static function versTexte(int $valeur, int $decimales): string
    {
        $valeur = self::arrondir($valeur, $decimales);
        $entier = intdiv($valeur, self::ECHELLE);

        if ($decimales === 0) {
            return (string) $entier;
        }

        $fraction = intdiv($valeur % self::ECHELLE, 10 ** (self::DECIMALES_INTERNES - $decimales));

        return $entier.'.'.str_pad((string) $fraction, $decimales, '0', STR_PAD_LEFT);
    }
}
