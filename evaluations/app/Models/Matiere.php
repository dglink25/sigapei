<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Matiere extends Modele
{
    use AppartientAuTenant;

    protected $table = 'matieres';

    protected $casts = ['coefficient_defaut' => 'string', 'active' => 'boolean'];

    public function coefficients(): HasMany
    {
        return $this->hasMany(CoefficientMatiere::class, 'matiere_id');
    }

    /** Coefficient applicable à un niveau (surcharge par cycle/niveau, sinon coefficient par défaut). */
    public function coefficientPour(string $cycle, string $niveau): string
    {
        $surcharge = $this->relationLoaded('coefficients')
            ? $this->coefficients->first(fn ($c) => $c->cycle === $cycle && $c->niveau === $niveau)
            : $this->coefficients()->where('cycle', $cycle)->where('niveau', $niveau)->first();

        return (string) ($surcharge?->coefficient ?? $this->coefficient_defaut);
    }
}
