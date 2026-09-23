<?php

namespace App\Common\Traits;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Génère et expose un uuid unique.
 *
 * Le uuid est la seule colonne exposée dans les URLs et les réponses API
 * (section 8 du CDC) ; l'identifiant interne id n'est jamais sérialisé.
 */
trait HasUuid
{
    protected static function bootHasUuid(): void
    {
        static::creating(function (Model $model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
