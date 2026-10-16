<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Demande de congé d'un membre du personnel : ouverte par le membre (ou son
 * responsable), validée ou refusée par la direction. Cycle de vie explicite
 * `en_attente` → `approuvee` / `refusee` / `annulee`. Aucune suppression physique.
 */
class Conge extends Modele
{
    use AppartientAuTenant;

    protected $table = 'conges';

    protected $casts = [
        'date_debut' => 'date:Y-m-d',
        'date_fin' => 'date:Y-m-d',
        'jours' => 'integer',
        'traitee_le' => 'datetime',
    ];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class, 'personnel_id');
    }

    public function enAttente(): bool
    {
        return $this->statut === 'en_attente';
    }
}
