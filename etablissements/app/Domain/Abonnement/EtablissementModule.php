<?php

namespace App\Domain\Abonnement;

use App\Domain\Etablissement\Etablissement;
use Illuminate\Database\Eloquent\Model;

class EtablissementModule extends Model
{
    protected $table = 'etablissement_modules';

    protected $fillable = ['etablissement_id', 'module', 'statut', 'date_activation'];

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }
}
