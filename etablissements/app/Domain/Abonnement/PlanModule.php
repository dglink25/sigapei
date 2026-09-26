<?php

namespace App\Domain\Abonnement;

use Illuminate\Database\Eloquent\Model;

class PlanModule extends Model
{
    protected $table = 'plan_modules';

    protected $fillable = ['plan_id', 'module', 'fonctionnalite', 'inclus'];

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }
}
