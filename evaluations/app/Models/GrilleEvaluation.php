<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Bibliothèque de grilles d'évaluation prédéfinies (CDC §4.2 ; stockage : DECISION-17 à valider).
 */
class GrilleEvaluation extends Model
{
    protected $table    = 'grilles_evaluation';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'code', 'nom', 'cycle', 'note_min', 'note_max',
        'avec_coefficients', 'avec_classement', 'echelle_appreciation', 'description',
    ];
    protected $casts = [
        'note_min'             => 'float',
        'note_max'             => 'float',
        'avec_coefficients'    => 'boolean',
        'avec_classement'      => 'boolean',
        'echelle_appreciation' => 'array',
    ];
}
