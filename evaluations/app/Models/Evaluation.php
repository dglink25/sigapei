<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evaluation extends Model
{
    protected $table    = 'evaluations';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'tenant_id', 'classe_uuid', 'matiere_id',
        'type', 'coefficient', 'date', 'periode', 'annee_scolaire',
        'est_composition_en_ligne', 'quiz_elearning_uuid', 'niveau_surveillance',
    ];
    protected $casts = [
        'coefficient'             => 'float',
        'date'                    => 'date',
        'est_composition_en_ligne' => 'boolean',
    ];

    public function matiere(): BelongsTo
    {
        return $this->belongsTo(Matiere::class, 'matiere_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'evaluation_id');
    }
}
