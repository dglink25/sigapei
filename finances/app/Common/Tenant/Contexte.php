<?php

namespace App\Common\Tenant;

use RuntimeException;

/**
 * Contexte de la requête (posé par VerifyTenantAndJwt) ou d'un traitement planifié (executerPour).
 * L'établissement est identifié par son uuid : la même clé qu'Identité (jeton) et Paiement.
 */
final class Contexte
{
    public static function aUnEtablissement(): bool
    {
        return app()->bound('current_etablissement');
    }

    public static function etablissement(): string
    {
        if (! self::aUnEtablissement()) {
            throw new RuntimeException('Contexte établissement absent.');
        }

        return (string) app('current_etablissement');
    }

    /** @return array{uuid: string, roleCode: string, etablissement: string} */
    public static function utilisateur(): array
    {
        if (! app()->bound('current_user')) {
            throw new RuntimeException('Utilisateur courant absent.');
        }

        return app('current_user');
    }

    public static function role(): string
    {
        return self::utilisateur()['roleCode'];
    }

    public static function utilisateurUuid(): string
    {
        return self::utilisateur()['uuid'];
    }

    /** Exécute un traitement hors requête (commande planifiée, notification interne) pour un établissement. */
    public static function executerPour(string $etablissement, callable $traitement, ?array $utilisateur = null): mixed
    {
        $precedent = app()->bound('current_etablissement') ? app('current_etablissement') : null;
        $userPrecedent = app()->bound('current_user') ? app('current_user') : null;

        app()->instance('current_etablissement', strtolower($etablissement));
        if ($utilisateur !== null) {
            app()->instance('current_user', $utilisateur);
        }

        try {
            return $traitement();
        } finally {
            $precedent === null ? app()->forgetInstance('current_etablissement') : app()->instance('current_etablissement', $precedent);
            if ($utilisateur !== null) {
                $userPrecedent === null ? app()->forgetInstance('current_user') : app()->instance('current_user', $userPrecedent);
            }
        }
    }
}
