<?php

namespace App\Domain\Abonnement;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $table = 'plans';

    protected $fillable = ['nom', 'prix', 'periodicite', 'actif', 'jours_essai'];

    // Regle transversale : aucun identifiant interne n'est expose par l'API (uuid uniquement).
    protected $hidden = ['id'];

    public function modules()
    {
        return $this->hasMany(PlanModule::class);
    }
}
