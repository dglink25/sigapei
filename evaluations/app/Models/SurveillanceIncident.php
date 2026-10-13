<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Anomalie détectée pendant une composition en ligne (phase 2).
 * JAMAIS de donnée biométrique. Journal sans updated_at.
 */
class SurveillanceIncident extends Model
{
    public $timestamps = false;

    protected $table    = 'surveillance_incident';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'evaluation_id', 'apprenant_uuid',
        'type_anomalie', 'horodatage', 'niveau_preuve',
    ];
    protected $casts = ['horodatage' => 'datetime'];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id');
    }
}
