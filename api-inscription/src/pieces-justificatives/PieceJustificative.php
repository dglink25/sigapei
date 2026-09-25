<?php

namespace App\pieces_justificatives;

use App\candidatures\Candidature;
use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PieceJustificative extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'inscription.pieces_justificatives';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'candidature_id',
        'type',
        'nom_original',
        'chemin_stockage',
        'taille_octets',
        'mime_type',
        'statut_validation',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'candidature_id' => 'integer',
        'taille_octets' => 'integer',
    ];

    public function candidature(): BelongsTo
    {
        return $this->belongsTo(Candidature::class, 'candidature_id');
    }
}
