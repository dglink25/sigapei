<?php

namespace App\Domain\Geo;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class Pays extends Model
{
    use GenereUuid;

    protected $table = 'pays';

    protected $fillable = [
        'code_iso', 'code_iso3', 'nom', 'indicatif_tel', 'continent',
        'libelle_niveau_1', 'libelle_niveau_2', 'libelle_niveau_3',
    ];

    public function departements()
    {
        return $this->hasMany(Departement::class);
    }
}
