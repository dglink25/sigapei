<?php

namespace App\Domain\Geo;

use Illuminate\Database\Eloquent\Model;

class Arrondissement extends Model
{
    protected $table = 'arrondissements';

    protected $fillable = ['commune_id', 'nom'];

    public function commune()
    {
        return $this->belongsTo(Commune::class);
    }
}
