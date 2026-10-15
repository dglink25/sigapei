<?php

namespace App\common\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use RuntimeException;

/**
 * Cloisonnement multi-tenant appliqué au niveau de l'ORM.
 *
 * ÉCHEC FERMÉ : en contexte HTTP, l'absence de tenant lié lève une exception
 * au lieu de laisser la requête s'exécuter sans filtre. L'ancien
 * comportement (`if ($tenantId !== null)`) était un fail-open silencieux :
 * une requête sans contexte de tenant renvoyait les données de TOUS les
 * établissements.
 *
 * Le tenant lié par le middleware VerifyTenantAndJwt est déjà résolu en
 * entier par TenantResolver : il correspond au type bigint des colonnes.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        if ($tenantId === null || $tenantId === '') {
            // Console / seeders / tests : pas de requête HTTP en cours, on
            // n'applique pas le filtre pour permettre les opérations
            // d'administration technique.
            if (app()->runningInConsole()) {
                return;
            }

            throw new RuntimeException(
                "Aucune requête SQL cross-tenant autorisée : le tenant courant n'est pas défini "
                . 'pour le modèle ' . get_class($model) . '. Le middleware VerifyTenantAndJwt doit '
                . "s'exécuter avant tout accès aux données."
            );
        }

        $builder->where($model->getTable() . '.tenant_id', $tenantId);
    }
}
