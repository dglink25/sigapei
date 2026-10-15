<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;

class ModeleBulletin extends Modele
{
    use AppartientAuTenant;

    protected $table = 'modele_bulletin';

    protected $casts = ['en_tete' => 'array', 'colonnes_affichees' => 'array'];
}
