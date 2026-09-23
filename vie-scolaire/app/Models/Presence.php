<?php

namespace App\Models;

use App\Common\TenantModel;

/**
 * Presence ou absence d'un apprenant a un cours donne (section 6 du CDC).
 *
 * apprenant_id et cours_id sont des references externes vers le schema
 * scolarite (apprenants, emplois_du_temps) ; aucune contrainte FK n'est
 * posee en base, la coherence est garantie applicativement par jointure
 * au moment de la requete (ScolariteClient).
 */
class Presence extends TenantModel
{
    protected $table = 'presences';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'apprenant_id',
        'cours_id',
        'statut',
        'date',
        'corrige_par_id',
        'motif_correction',
        'corrige_le',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'corrige_le' => 'datetime',
        ];
    }

    public function estAbsence(): bool
    {
        return $this->statut === 'absent';
    }
}
