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

    /**
     * UUID publics dérivés d'une relation : `['attribut_uuid' => 'nomRelation']`.
     * L'attribut n'est exposé que si la relation est chargée (jamais de `null`
     * trompeur pour une clé interne masquée).
     *
     * @var array<string, string>
     */
    protected array $uuidRelations = [];

    /** uuid généré côté application (connu dès la création, ordonné dans le temps). */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function toArray(): array
    {
        $donnees = parent::toArray();

        foreach ($this->uuidRelations as $attribut => $relation) {
            if ($this->relationLoaded($relation)) {
                $donnees[$attribut] = $this->{$relation}?->uuid;
            }
        }

        return $donnees;
    }
}
