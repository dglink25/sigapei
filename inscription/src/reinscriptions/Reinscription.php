<?php

namespace App\reinscriptions;

use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Reinscription extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'inscription.reinscriptions';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'apprenant_id',
        'ancienne_classe_id',
        'nouvelle_classe_id',
        'annee_scolaire',
        'statut',
        'motif_rejet',
        'date_demande',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'apprenant_id' => 'integer',
        'ancienne_classe_id' => 'integer',
        'nouvelle_classe_id' => 'integer',
        'date_demande' => 'datetime',
    ];
}
