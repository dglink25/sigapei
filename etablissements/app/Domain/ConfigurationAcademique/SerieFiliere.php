<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class SerieFiliere extends Model
{
    use GenereUuid;

    protected $table  = 'series_filieres';
    protected $hidden = ['id', 'etablissement_id', 'subdivision_id'];

    protected $fillable = [
        'etablissement_id', 'cycle', 'subdivision_id',
        'nom', 'code', 'description', 'actif',
    ];
    protected $casts = ['actif' => 'boolean'];

    public function subdivision() { return $this->belongsTo(SubdivisionPedagogique::class, 'subdivision_id'); }
    public function classes()     { return $this->hasMany(ClasseConfig::class, 'serie_id'); }
    public function cohortes()    { return $this->hasMany(CohorteUniversitaire::class, 'filiere_id'); }
}
