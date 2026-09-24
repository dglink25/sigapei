<?php

namespace App\Models;

use App\Common\TenantModel;

/**
 * Journal d'audit inaltérable (section 10 du CDC) : corrections de
 * présence, incidents disciplinaires et sanctions. Toute entrée est
 * horodatée, rattachée à son tenant et consultable filtrée par tenant.
 */
class AuditLog extends TenantModel
{
    protected $table = 'audit_logs';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'acteur_id',
        'action',
        'entite',
        'entite_uuid',
        'avant',
        'apres',
        'motif',
    ];

    protected function casts(): array
    {
        return [
            'avant' => 'array',
            'apres' => 'array',
        ];
    }
}
