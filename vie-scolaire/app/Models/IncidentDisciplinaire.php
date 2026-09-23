<?php

namespace App\Models;

use App\Common\TenantModel;

/**
 * Incident disciplinaire et sa sanction associee (section 6 du CDC).
 *
 * Une sanction est modelisee comme un etat de l'incident : un incident
 * peut exister sans sanction, une sanction ne peut jamais exister sans
 * incident (regle de gestion, section 9).
 */
class IncidentDisciplinaire extends TenantModel
{
    protected $table = 'incidents_disciplinaires';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'apprenant_id',
        'auteur_id',
        'type',
        'description',
        'sanction',
        'sanction_appliquee_par_id',
        'sanction_appliquee_le',
    ];

    protected function casts(): array
    {
        return [
            'sanction_appliquee_le' => 'datetime',
        ];
    }

    public function aUneSanction(): bool
    {
        return filled($this->sanction);
    }
}
