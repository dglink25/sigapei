<?php

namespace App\Models;

use App\Common\TenantModel;

/**
 * Formule de cantine souscrite et statut de paiement — V2+, HORS LOT.
 *
 * La structure est posee des ce lot pour eviter toute migration disruptive
 * lors de l'activation de la version 2, mais aucun endpoint ne l'expose
 * (section 2.4 / 8 / 9 du CDC).
 */
class Cantine extends TenantModel
{
    protected $table = 'cantine';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'apprenant_id',
        'formule',
        'statut_paiement',
    ];
}
