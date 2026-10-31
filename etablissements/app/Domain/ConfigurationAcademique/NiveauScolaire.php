<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class NiveauScolaire extends Model
{
    use GenereUuid;

    protected $table  = 'niveaux_scolaires';
    protected $hidden = ['id', 'etablissement_id'];

    protected $fillable = [
        'etablissement_id', 'cycle', 'nom', 'abreviation', 'ordre', 'actif',
        'a_series', 'cycle_univ', 'subdivision_id', 'serie_id',
    ];
    protected $casts = [
        'actif'    => 'boolean',
        'ordre'    => 'integer',
        'a_series' => 'boolean',
    ];

    public function subdivision()   { return $this->belongsTo(SubdivisionPedagogique::class, 'subdivision_id'); }
    public function serie()         { return $this->belongsTo(SerieFiliere::class, 'serie_id'); }
    public function series()        { return $this->hasMany(SerieFiliere::class, 'promotion_id'); }
    public function classes()       { return $this->hasMany(ClasseConfig::class, 'niveau_id'); }
    public function matieres()      { return $this->hasMany(MatiereConfig::class, 'niveau_id'); }
    public function cohortes()      { return $this->hasMany(CohorteUniversitaire::class, 'niveau_id'); }
}
