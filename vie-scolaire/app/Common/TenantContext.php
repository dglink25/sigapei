<?php

namespace App\Common;

use Illuminate\Contracts\Container\BindingResolutionException;

/**
 * Contexte tenant porté par la requête courante.
 *
 * La passerelle API a déjà vérifié le JWT et le statut du tenant avant
 * transmission (section 10 du CDC). Le middleware ResolveTenantContext
 * extrait ensuite les claims (tenant_id, sub, role) des entêtes de la
 * passerelle pour alimenter ce contexte, consommé par TenantScope et par
 * les services (section 8).
 */
final class TenantContext
{
    public function __construct(
        public readonly int $tenantId,
        public readonly ?string $userId = null,
        public readonly string $role = '',
    ) {}

    public static function current(): ?self
    {
        return app()->bound(self::class) ? resolve(self::class) : null;
    }

    public static function tenantId(): ?int
    {
        return self::current()?->tenantId;
    }

    public static function role(): string
    {
        return strtolower(self::current()?->role ?? '');
    }

    public static function userId(): ?string
    {
        return self::current()?->userId;
    }

    /**
     * @throws BindingResolutionException
     */
    public static function mustHaveTenant(): int
    {
        return self::tenantId() ?? throw new \RuntimeException('Contexte tenant absent.');
    }
}
