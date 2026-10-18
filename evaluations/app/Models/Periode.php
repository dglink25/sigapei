<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;

class Periode extends Modele
{
    use AppartientAuTenant;

    protected $table = 'periodes';

    protected $casts = [
        'date_debut' => 'date:Y-m-d',
        'date_fin' => 'date:Y-m-d',
        'numero' => 'integer',
        'cloturee_le' => 'datetime',
    ];

    public function estOuverte(): bool
    {
        return $this->statut === 'ouverte';
    }

    public function estCloturee(): bool
    {
        return $this->statut === 'cloturee';
    }
}
