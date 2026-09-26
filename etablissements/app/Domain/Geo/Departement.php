<?php

namespace App\Domain\Geo;

use Illuminate\Database\Eloquent\Model;

class Departement extends Model
{
    protected $table = 'departements';

    protected $fillable = ['pays_id', 'nom'];

    public function pays()
    {
        return $this->belongsTo(Pays::class);
    }

    public function communes()
    {
        return $this->hasMany(Commune::class);
    }
}
