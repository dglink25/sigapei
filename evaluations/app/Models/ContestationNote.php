<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Contestation d'une note — statuts : ouverte | en_examen | resolue | rejetee (CDC §9).
 */
class ContestationNote extends Model
{
    protected $table    = 'contestation_note';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'tenant_id', 'note_id', 'demandeur_uuid',
        'statut', 'motif', 'date_ouverture',
    ];
    protected $casts = ['date_ouverture' => 'datetime'];

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class, 'note_id');
    }
}
