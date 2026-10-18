<?php

namespace App\Models;

use App\Common\Tenant\Contexte;
use Illuminate\Database\Eloquent\Builder;

/**
 * Barème (CDC §4.2). tenant_id NULL = grille plateforme, visible par tous les établissements.
 * Pas de AppartientAuTenant : la visibilité est "plateforme + mon établissement".
 */
class GrilleEvaluation extends Modele
{
    protected $table = 'grilles_evaluation';

    protected $casts = [
        'note_min' => 'string',
        'note_max' => 'string',
        'avec_coefficients' => 'boolean',
        'avec_classement' => 'boolean',
        'active' => 'boolean',
        'niveaux_competence' => 'array',
    ];

    public function scopeVisibles(Builder $q): Builder
    {
        return $q->where(fn ($w) => $w->whereNull('tenant_id')->orWhere('tenant_id', Contexte::tenantId()));
    }

    public function estPlateforme(): bool
    {
        return $this->tenant_id === null;
    }
}
