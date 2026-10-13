<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Note extends Model
{
    protected $table    = 'notes';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'tenant_id', 'apprenant_uuid',
        'evaluation_id', 'valeur', 'saisi_par_uuid', 'date_saisie',
    ];
    protected $casts = [
        'valeur'      => 'float',
        'date_saisie' => 'datetime',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_id');
    }

    public function contestations(): HasMany
    {
        return $this->hasMany(ContestationNote::class, 'note_id');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(AuditNote::class, 'note_id');
    }
}
