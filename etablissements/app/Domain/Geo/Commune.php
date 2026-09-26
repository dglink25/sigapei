<?php

namespace App\Domain\Geo;

use Illuminate\Database\Eloquent\Model;

class Commune extends Model
{
    protected $table = 'communes';

    protected $fillable = ['departement_id', 'nom'];

    public function departement()
    {
        return $this->belongsTo(Departement::class);
    }

    public function arrondissements()
    {
        return $this->hasMany(Arrondissement::class);
    }
}
