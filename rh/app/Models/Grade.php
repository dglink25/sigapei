<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Grade / corps de la fonction publique ou catégorie interne de l'établissement.
 * Référentiel paramétrable par tenant ; un grade n'est jamais supprimé s'il est
 * référencé par un contrat (désactivation).
 */
class Grade extends Modele
{
    use AppartientAuTenant;

    protected $table = 'grades';

    protected $casts = [
        'echelon_min' => 'integer',
        'echelon_max' => 'integer',
        'active' => 'boolean',
    ];

    public function contrats(): HasMany
    {
        return $this->hasMany(Contrat::class, 'grade_id');
    }
}
