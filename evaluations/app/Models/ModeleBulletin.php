<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modèle de bulletin par établissement (tenant_id) et par cycle (CDC §4.1).
 */
class ModeleBulletin extends Model
{
    protected $table    = 'modele_bulletin';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'tenant_id', 'cycle', 'en_tete', 'colonnes_affichees',
        'echelle_appreciation', 'arrondi', 'mentions_bas_de_page',
    ];
    protected $casts = [
        'en_tete'              => 'array',
        'colonnes_affichees'   => 'array',
        'echelle_appreciation' => 'array',
    ];
}
