<?php

namespace App\Domain\Geo;

use Illuminate\Database\Eloquent\Model;

class Pays extends Model
{
    protected $table = 'pays';

    protected $fillable = ['code_iso', 'nom', 'indicatif_tel'];

    public function departements()
    {
        return $this->hasMany(Departement::class);
    }
}
