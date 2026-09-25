<?php

namespace App\apprenants;

use App\classes\Classe;
use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoriqueClasse extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'scolarite.historique_classes';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'apprenant_id',
        'ancienne_classe_id',
        'nouvelle_classe_id',
        'motif',
        'date_transfert',
        'effectue_par_utilisateur_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'apprenant_id' => 'integer',
        'ancienne_classe_id' => 'integer',
        'nouvelle_classe_id' => 'integer',
        'date_transfert' => 'datetime',
    ];

    public function ancienneClasse(): BelongsTo
    {
        return $this->belongsTo(Classe::class, 'ancienne_classe_id');
    }

    public function nouvelleClasse(): BelongsTo
    {
        return $this->belongsTo(Classe::class, 'nouvelle_classe_id');
    }

    public function apprenant(): BelongsTo
    {
        return $this->belongsTo(Apprenant::class, 'apprenant_id');
    }
}
