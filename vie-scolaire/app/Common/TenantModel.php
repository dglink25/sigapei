<?php

namespace App\Common;

use App\Common\Scopes\TenantScope;
use App\Common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle de base du schéma vie_scolaire.
 *
 * Applique systématiquement :
 *  - un uuid unique (seule colonne exposée par l'API) ;
 *  - le filtre automatique tenant_id (TenantScope) ;
 *  - le pré-remplissage de tenant_id à la création depuis le contexte.
 */
abstract class TenantModel extends Model
{
    use HasUuid;

    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model): void {
            $model->tenant_id ??= TenantContext::tenantId();
        });
    }

    public function scopePourTenant(Builder $query): Builder
    {
        return $query;
    }
}
