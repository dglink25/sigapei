<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Échéance d'une facture (en ajout seul). Rattachée à une facture : jamais lue sans elle. */
class Echeance extends Model
{
    public $timestamps = false;

    protected $table = 'echeances';

    protected $guarded = ['id'];

    protected $hidden = ['id', 'facture_id'];

    protected $casts = ['montant' => 'integer', 'rang' => 'integer', 'date_echeance' => 'date:Y-m-d'];
}
