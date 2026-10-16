<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Fonction du module RH accordée (ou non) à un rôle RH (CDC RH §7.8).
 *
 * `fonction` ∈ dossiers, affectations, charges_horaires, conges, evaluations,
 * contrats_intervenants ; `inclus` active ou désactive la fonction pour le rôle.
 * Table pivot sans identifiant public : l'`id` interne n'est jamais exposé.
 */
class RoleRhModule extends Model
{
    protected $table = 'role_rh_modules';

    protected $fillable = ['role_rh_id', 'fonction', 'inclus'];

    protected $casts = [
        'inclus' => 'boolean',
    ];

    protected $hidden = ['id'];

    public function roleRh(): BelongsTo
    {
        return $this->belongsTo(RoleRh::class, 'role_rh_id');
    }
}
