<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Base commune : clé interne `id` jamais exposée (CDC §13), routes et API par `uuid` uniquement.
 */
abstract class Modele extends Model
{
    use HasUuids;

    protected $guarded = ['id', 'uuid', 'tenant_id'];

    protected $hidden = ['id', 'tenant_id'];

    /** uuid généré côté application (connu dès la création, ordonné dans le temps). */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
