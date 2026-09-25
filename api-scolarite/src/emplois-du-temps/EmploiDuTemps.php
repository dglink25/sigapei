<?php

namespace App\emplois_du_temps;

use App\classes\Classe;
use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmploiDuTemps extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'scolarite.emplois_du_temps';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'classe_id',
        'enseignant_id',
        'matiere_id',
        'creneau',
        'jour',
        'heure_debut',
        'heure_fin',
        'salle',
        'statut',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'classe_id' => 'integer',
        'enseignant_id' => 'integer',
        'matiere_id' => 'integer',
    ];

    public function classe(): BelongsTo
    {
        return $this->belongsTo(Classe::class, 'classe_id');
    }
}
