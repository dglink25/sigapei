<?php

namespace App\Domain\Etablissement;

use App\Domain\Geo\Arrondissement;
use App\Domain\Geo\Commune;
use App\Domain\Geo\Departement;
use App\Domain\Geo\Pays;
use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class Etablissement extends Model
{
    use GenereUuid;

    protected $table = 'etablissements';

    protected $fillable = [
        'code', 'slug', 'matricule', 'nom', 'logo_document_id', 'types', 'annee_ouverture',
        'pays_id', 'departement_id', 'commune_id', 'arrondissement_id',
        'adresse_complete', 'email', 'telephone_1', 'telephone_2',
        'latitude', 'longitude', 'statut', 'date_validation',
    ];

    protected $casts = [
        'types' => 'array',
        'date_validation' => 'datetime',
    ];

    public function pays()
    {
        return $this->belongsTo(Pays::class);
    }

    public function departement()
    {
        return $this->belongsTo(Departement::class);
    }

    public function commune()
    {
        return $this->belongsTo(Commune::class);
    }

    public function arrondissement()
    {
        return $this->belongsTo(Arrondissement::class);
    }

    public function cyclesAutorises()
    {
        return $this->hasMany(CycleAutorise::class);
    }

    public function abonnements()
    {
        return $this->hasMany(\App\Domain\Abonnement\Abonnement::class);
    }

    public function modulesActifs()
    {
        return $this->hasMany(\App\Domain\Abonnement\EtablissementModule::class);
    }
}
