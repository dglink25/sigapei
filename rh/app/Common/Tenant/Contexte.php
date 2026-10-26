<?php

namespace App\Common\Tenant;

use RuntimeException;

/**
 * Accès typé au contexte de la requête (posé par VerifyTenantAndJwt) ou d'un job (posé par executerPour).
 */
final class Contexte
{
    public static function aUnTenant(): bool
    {
        return app()->bound('current_tenant_id');
    }

    public static function tenantId(): int
    {
        if (! self::aUnTenant()) {
            throw new RuntimeException('Contexte tenant absent.');
        }

        return (int) app('current_tenant_id');
    }

    /** @return array{uuid: string, roleCode: string, tenantId: int} */
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

    /**
     * Exécute un traitement hors requête HTTP (job, commande) dans le contexte d'un tenant,
     * puis restaure l'état précédent.
     */
    public static function executerPour(int $tenantId, callable $traitement, ?array $utilisateur = null): mixed
    {
        $tenantPrecedent = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $userPrecedent = app()->bound('current_user') ? app('current_user') : null;

        app()->instance('current_tenant_id', $tenantId);
        if ($utilisateur !== null) {
            app()->instance('current_user', $utilisateur);
        }

        try {
            return $traitement();
        } finally {
            $tenantPrecedent === null ? app()->forgetInstance('current_tenant_id') : app()->instance('current_tenant_id', $tenantPrecedent);
            if ($utilisateur !== null) {
                $userPrecedent === null ? app()->forgetInstance('current_user') : app()->instance('current_user', $userPrecedent);
            }
        }
    }
}
