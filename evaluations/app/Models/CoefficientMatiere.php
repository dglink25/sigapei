<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;

class CoefficientMatiere extends Modele
{
    use AppartientAuTenant;

    protected $table = 'coefficients_matiere';

    protected $hidden = ['id', 'tenant_id', 'matiere_id', 'created_at', 'updated_at'];

    protected $casts = ['coefficient' => 'string'];
}
