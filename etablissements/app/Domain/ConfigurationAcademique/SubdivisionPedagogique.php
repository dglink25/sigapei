<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class SubdivisionPedagogique extends Model
{
    use GenereUuid;

    protected $table  = 'subdivisions_pedagogiques';
    protected $hidden = ['id', 'etablissement_id', 'annee_id', 'cycle_config_id'];

    protected $fillable = [
        'etablissement_id', 'annee_id', 'cycle_config_id',
        'type', 'nom', 'code', 'description', 'actif',
        'cycle_univ', 'option_unique',
    ];
    protected $casts = [
        'actif' => 'boolean',
        'option_unique' => 'boolean',
    ];

    const TYPES = ['groupe', 'section', 'departement'];

    public function cycleConfig(){ return $this->belongsTo(CycleConfig::class, 'cycle_config_id'); }
    public function annee()      { return $this->belongsTo(AnneeAcademique::class, 'annee_id'); }
    public function filieres()   { return $this->hasMany(SerieFiliere::class, 'subdivision_id'); }
    public function classes()    { return $this->hasMany(ClasseConfig::class, 'subdivision_id'); }
}
