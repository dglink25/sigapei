<?php

namespace App\classes;

use App\apprenants\Apprenant;
use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use App\emplois_du_temps\EmploiDuTemps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classe extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'scolarite.classes';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'nom',
        'cycle',
        'niveau',
        'filiere',
        'programme',
        'capacite',
        'statut',
    ];

    protected $casts = [
        'capacite' => 'integer',
        'tenant_id' => 'integer',
    ];

    public function apprenants(): HasMany
    {
        return $this->hasMany(Apprenant::class, 'classe_id')
            ->where('statut', 'actif');
    }

    public function emploisDuTemps(): HasMany
    {
        return $this->hasMany(EmploiDuTemps::class, 'classe_id');
    }

    /**
     * Calcule la capacite restante en direct
     */
    public function getPlacesDisponiblesAttribute(): int
    {
        $inscrits = $this->apprenants()->count();
        return max(0, $this->capacite - $inscrits);
    }

    public function getEstCompleteAttribute(): bool
    {
        return $this->places_disponibles <= 0;
    }
}
