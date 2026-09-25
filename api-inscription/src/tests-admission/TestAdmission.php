<?php

namespace App\tests_admission;

use App\candidatures\Candidature;
use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TestAdmission extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'inscription.tests_admission';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'candidature_id',
        'type_test',
        'matiere',
        'note',
        'note_max',
        'resultat',
        'observations',
        'evalue_par_id',
        'date_test',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'candidature_id' => 'integer',
        'evalue_par_id' => 'integer',
        'note' => 'float',
        'note_max' => 'float',
        'date_test' => 'date',
    ];

    public function candidature(): BelongsTo
    {
        return $this->belongsTo(Candidature::class, 'candidature_id');
    }
}
