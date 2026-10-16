<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Contrat de travail d'un membre du personnel : type, période, quotité, rémunération
 * de base et grade. Un seul contrat actif à la fois par membre ; l'historique est
 * conservé (jamais de suppression, statut `termine`).
 */
class Contrat extends Modele
{
    use AppartientAuTenant;

    protected $table = 'contrats';

    protected $casts = [
        'date_debut' => 'date:Y-m-d',
        'date_fin' => 'date:Y-m-d',
        'quotite' => 'integer',
        'salaire_base' => 'decimal:2',
        'est_actif' => 'boolean',
    ];

    /** `personnel_id` et `grade_id` sont des clés internes : jamais exposées. */
    protected $hidden = ['id', 'tenant_id', 'personnel_id', 'grade_id'];

    protected $appends = ['personnel_uuid', 'grade_uuid'];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class, 'personnel_id');
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class, 'grade_id');
    }

    public function getPersonnelUuidAttribute(): ?string
    {
        return $this->relationLoaded('personnel') ? $this->personnel?->uuid : null;
    }

    public function getGradeUuidAttribute(): ?string
    {
        return $this->relationLoaded('grade') ? $this->grade?->uuid : null;
    }

    public function enCours(): bool
    {
        return $this->est_actif && $this->date_fin === null;
    }
}
