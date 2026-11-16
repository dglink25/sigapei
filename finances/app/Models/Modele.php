<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Base commune : clé interne `id` jamais exposée, API par `uuid` uniquement (généré côté application). */
abstract class Modele extends Model
{
    use HasUuids;

    protected $guarded = ['id', 'uuid', 'etablissement_uuid'];

    protected $hidden = ['id', 'etablissement_uuid'];

    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
