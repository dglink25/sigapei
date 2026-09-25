<?php

namespace App\candidatures;

use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use App\pieces_justificatives\PieceJustificative;
use App\tests_admission\TestAdmission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Candidature extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'inscription.candidatures';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'nom',
        'prenom',
        'date_naissance',
        'sexe',
        'email',
        'telephone',
        'adresse',
        'classe_visee_id',
        'statut',
        'date_soumission',
        'motif_rejet',
        'parent_nom',
        'parent_prenom',
        'parent_telephone',
        'parent_email',
        'parent_lien',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'classe_visee_id' => 'integer',
        'date_naissance' => 'date',
        'date_soumission' => 'datetime',
    ];

    public function piecesJustificatives(): HasMany
    {
        return $this->hasMany(PieceJustificative::class, 'candidature_id');
    }

    public function testsAdmission(): HasMany
    {
        return $this->hasMany(TestAdmission::class, 'candidature_id');
    }
}
