<?php

namespace App\Domain\Etablissement;

use App\Domain\Geo\Arrondissement;
use Illuminate\Database\Eloquent\Model;

class Etablissement extends Model
{
    protected $table = 'etablissements';

    protected $fillable = [
        'slug', 'matricule', 'nom', 'logo_document_id', 'types', 'annee_ouverture',
        'arrondissement_id', 'adresse_complete', 'email', 'telephone_1', 'telephone_2',
        'latitude', 'longitude', 'statut', 'date_validation',
    ];

    protected $casts = [
        'types' => 'array',
        'date_validation' => 'datetime',
    ];

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
