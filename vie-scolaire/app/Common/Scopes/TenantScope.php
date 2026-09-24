<?php

namespace App\Common\Scopes;

use App\Common\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Filtre automatiquement toutes les requêtes du schéma par tenant_id
 * (section 10 du CDC : "chaque table porte systématiquement une colonne
 * tenant_id, filtrée automatiquement par la couche d'accès aux données").
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if ($tenantId = TenantContext::tenantId()) {
            $builder->where($model->getTable().'.tenant_id', $tenantId);
        }
    }
}
