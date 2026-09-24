<?php

namespace App\Models;

use App\Common\TenantModel;

/**
 * Formule de transport scolaire souscrite et statut de paiement — V2+,
 * HORS LOT. Structure identique a "cantine", voir ce modele pour le contexte.
 */
class Transport extends TenantModel
{
    protected $table = 'transport';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'apprenant_id',
        'formule',
        'statut_paiement',
    ];
}
