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
    ];
    protected $casts = ['actif' => 'boolean', 'ordre' => 'integer'];

    public function classes()       { return $this->hasMany(ClasseConfig::class, 'niveau_id'); }
    public function matieres()      { return $this->hasMany(MatiereConfig::class, 'niveau_id'); }
    public function cohortes()      { return $this->hasMany(CohorteUniversitaire::class, 'niveau_id'); }
}
