<?php

namespace App\Domain\Abonnement;

use Illuminate\Database\Eloquent\Model;

class AbonnementPaiement extends Model
{
    protected $table = 'abonnements_paiements';

    protected $fillable = ['abonnement_id', 'montant', 'agregateur', 'reference_externe', 'statut'];

    public function abonnement()
    {
        return $this->belongsTo(Abonnement::class);
    }
}
