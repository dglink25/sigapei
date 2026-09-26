<?php

namespace App\apprenants;

use App\classes\Classe;
use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Apprenant extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'scolarite.apprenants';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'classe_id',
        'utilisateur_id',
        'candidature_id',
        'matricule',
        'nom',
        'prenom',
        'date_naissance',
        'sexe',
        'statut',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'classe_id' => 'integer',
        'utilisateur_id' => 'integer',
        'candidature_id' => 'integer',
        'date_naissance' => 'date',
    ];

    public function classe(): BelongsTo
    {
        return $this->belongsTo(Classe::class, 'classe_id');
    }

    public function historiqueClasses(): HasMany
    {
        return $this->hasMany(HistoriqueClasse::class, 'apprenant_id')
            ->orderBy('date_transfert', 'desc');
    }

    public function parents(): HasMany
    {
        return $this->hasMany(ParentApprenant::class, 'apprenant_id');
    }
}
