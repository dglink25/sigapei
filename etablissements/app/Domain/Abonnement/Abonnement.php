<?php

namespace App\Domain\Abonnement;

use App\Domain\Etablissement\Etablissement;
use Illuminate\Database\Eloquent\Model;

class Abonnement extends Model
{
    protected $table = 'abonnements';

    protected $fillable = ['etablissement_id', 'plan_id', 'date_debut', 'date_fin', 'statut'];

    protected $casts = ['date_debut' => 'datetime', 'date_fin' => 'datetime'];

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function paiements()
    {
        return $this->hasMany(AbonnementPaiement::class);
    }
}
