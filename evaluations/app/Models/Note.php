<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Source unique de tout calcul (CDC §3). Jamais supprimée (trigger en base). */
class Note extends Modele
{
    use AppartientAuTenant;

    protected $table = 'notes';

    protected $hidden = ['id', 'tenant_id', 'evaluation_id'];

    protected $casts = [
        'valeur' => 'string',
        'version' => 'integer',
        'saisi_le' => 'datetime',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(AuditNote::class, 'note_id');
    }
}
