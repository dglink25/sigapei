<?php

namespace App\Domain\Geo;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class Departement extends Model
{
    use GenereUuid;

    protected $table = 'departements';

    protected $fillable = ['pays_id', 'nom', 'source', 'code_externe'];

    public function pays()
    {
        return $this->belongsTo(Pays::class);
    }

    public function communes()
    {
        return $this->hasMany(Commune::class);
    }
}
