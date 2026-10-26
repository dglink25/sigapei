<?php

namespace App\Domain\Geo;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class Arrondissement extends Model
{
    use GenereUuid;

    protected $table = 'arrondissements';

    protected $fillable = ['commune_id', 'nom', 'source', 'code_externe'];

    public function commune()
    {
        return $this->belongsTo(Commune::class);
    }
}
