<?php

namespace App\Domain\Geo;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class Commune extends Model
{
    use GenereUuid;

    protected $table = 'communes';

    protected $fillable = ['departement_id', 'nom', 'source', 'code_externe'];

    public function departement()
    {
        return $this->belongsTo(Departement::class);
    }

    public function arrondissements()
    {
        return $this->hasMany(Arrondissement::class);
    }
}
