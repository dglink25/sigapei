<?php

namespace App\apprenants;

use App\common\Traits\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentApprenant extends Model
{
    use HasTenant;

    protected $table = 'scolarite.parents_apprenants';

    protected $fillable = [
        'tenant_id',
        'parent_id',
        'apprenant_id',
        'lien_parente',
        'est_responsable_legal',
        'est_contact_urgence',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'parent_id' => 'integer',
        'apprenant_id' => 'integer',
        'est_responsable_legal' => 'boolean',
        'est_contact_urgence' => 'boolean',
    ];

    public function apprenant(): BelongsTo
    {
        return $this->belongsTo(Apprenant::class, 'apprenant_id');
    }
}
