<?php

namespace App\Domain\Abonnement;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class AbonnementPaiement extends Model
{
    use GenereUuid;

    protected $table = 'abonnements_paiements';

    protected $fillable = ['abonnement_id', 'montant', 'agregateur', 'reference_externe', 'statut'];

    public function abonnement()
    {
        return $this->belongsTo(Abonnement::class);
    }
}
