<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Ligne d'une facture (en ajout seul). Rattachée à une facture : jamais lue sans elle. */
class FactureLigne extends Model
{
    public $timestamps = false;

    protected $table = 'facture_lignes';

    protected $guarded = ['id'];

    protected $hidden = ['id', 'facture_id'];

    protected $casts = ['montant' => 'integer', 'ordre' => 'integer'];
}
