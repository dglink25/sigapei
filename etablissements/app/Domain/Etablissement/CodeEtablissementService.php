<?php

namespace App\Domain\Etablissement;

/**
 * Code public unique d'un etablissement : 4 caracteres (format XXXX).
 *
 * Alphabet : lettres majuscules et chiffres, sans les caracteres ambigus a la
 * lecture ou a la dictée (I, L, O, 0, 1) : 31 symboles, soit 923 521 codes.
 * Distinct du slug (URL) et du matricule (identifiant de connexion du dirigeant).
 *
 * L'unicite est garantie deux fois : verification avant ecriture (ici) et
 * index unique + contrainte de format en base (migration 2026_10_14_000003).
 */
class CodeEtablissementService
{
    public const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public const LONGUEUR = 4;

    public const MOTIF = '/^[A-Z0-9]{4}$/';

    public function generer(): string
    {
        do {
            $code = '';
            for ($i = 0; $i < self::LONGUEUR; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (Etablissement::where('code', $code)->exists());

        return $code;
    }

    /** La recherche par code n'est pas sensible a la casse ni aux espaces autour. */
    public static function normaliser(string $code): string
    {
        return strtoupper(trim($code));
    }

    public static function estValide(string $code): bool
    {
        return preg_match(self::MOTIF, $code) === 1;
    }
}
