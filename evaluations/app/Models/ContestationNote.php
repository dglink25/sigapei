<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContestationNote extends Modele
{
    use AppartientAuTenant;

    protected $table = 'contestation_note';

    protected $hidden = ['id', 'tenant_id', 'note_id'];

    protected $casts = [
        'ouverte_le' => 'datetime',
        'escaladee_le' => 'datetime',
        'cloturee_le' => 'datetime',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class, 'note_id');
    }

    public function estActive(): bool
    {
        return in_array($this->statut, ['ouverte', 'en_examen'], true);
    }
}
