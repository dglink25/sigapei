<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class CycleConfig extends Model
{
    use GenereUuid;

    protected $table = 'cycles_config';
    protected $hidden = ['id', 'etablissement_id', 'annee_id'];

    protected $fillable = ['etablissement_id', 'annee_id', 'cycle', 'actif', 'cycle_unique'];
    protected $casts    = ['actif' => 'boolean', 'cycle_unique' => 'boolean'];

    const CYCLES = ['maternelle', 'primaire', 'secondaire', 'universitaire'];

    public function annee()       { return $this->belongsTo(AnneeAcademique::class, 'annee_id'); }
    public function subdivisions(){ return $this->hasMany(SubdivisionPedagogique::class, 'cycle_config_id'); }
}
