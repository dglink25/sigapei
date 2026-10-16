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

    /** `personnel_id` est une clé interne : jamais exposée, remplacée par `personnel_uuid`. */
    protected $hidden = ['id', 'tenant_id', 'personnel_id'];

    protected $appends = ['personnel_uuid'];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class, 'personnel_id');
    }

    public function getPersonnelUuidAttribute(): ?string
    {
        return $this->relationLoaded('personnel') ? $this->personnel?->uuid : null;
    }

    public function enAttente(): bool
    {
        return $this->statut === 'en_attente';
    }
}
