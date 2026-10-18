<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;

/** Phase 2 - compositions en ligne. */
class SurveillanceIncident extends Modele
{
    use AppartientAuTenant;

    public $timestamps = false;

    protected $table = 'surveillance_incident';

    protected $hidden = ['id', 'tenant_id', 'evaluation_id'];
}
