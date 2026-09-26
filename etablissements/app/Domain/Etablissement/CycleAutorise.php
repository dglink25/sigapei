<?php

namespace App\Domain\Etablissement;

use Illuminate\Database\Eloquent\Model;

class CycleAutorise extends Model
{
    protected $table = 'cycles_autorises';

    protected $fillable = ['etablissement_id', 'cycle', 'statut'];

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }
}
