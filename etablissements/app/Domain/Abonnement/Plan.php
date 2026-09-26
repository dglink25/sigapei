<?php

namespace App\Domain\Abonnement;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $table = 'plans';

    protected $fillable = ['nom', 'prix', 'periodicite', 'actif', 'jours_essai'];

    public function modules()
    {
        return $this->hasMany(PlanModule::class);
    }
}
