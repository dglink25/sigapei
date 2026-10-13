<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evaluation extends Modele
{
    use AppartientAuTenant;

    protected $table = 'evaluations';

    protected $hidden = ['id', 'tenant_id', 'periode_id', 'matiere_id', 'rattrapage_de_id'];

    protected $casts = [
        'date_evaluation' => 'date:Y-m-d',
        'coefficient' => 'string',
        'note_sur' => 'string',
        'est_composition_en_ligne' => 'boolean',
        'niveau_surveillance' => 'integer',
        'saisie_cloturee_le' => 'datetime',
    ];

    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class, 'periode_id');
    }

    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class, 'matiere_id');
    }

    public function rattrapageDe(): BelongsTo
    {
        return $this->belongsTo(self::class, 'rattrapage_de_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'evaluation_id');
    }
}
