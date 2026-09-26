<?php

namespace App\Domain\Onboarding;

use App\Domain\Etablissement\Etablissement;
use App\Domain\Geo\Arrondissement;
use Illuminate\Database\Eloquent\Model;

class DemandeEtablissement extends Model
{
    protected $table = 'demandes_etablissement';

    protected $fillable = [
        'donnees_formulaire',
        'arrondissement_id',
        'adresse_complete',
        'latitude',
        'longitude',
        'dirigeant_nom',
        'dirigeant_titre',
        'dirigeant_email',
        'dirigeant_telephone',
        'statut',
        'champs_a_corriger',
        'lien_correction_token',
        'lien_correction_expire_le',
        'date_dernier_rappel',
        'date_soumission',
        'etablissement_id',
    ];

    protected $casts = [
        'donnees_formulaire' => 'array',
        'champs_a_corriger' => 'array',
        'lien_correction_expire_le' => 'datetime',
        'date_dernier_rappel' => 'datetime',
        'date_soumission' => 'datetime',
    ];

    public function arrondissement()
    {
        return $this->belongsTo(Arrondissement::class);
    }

    public function documents()
    {
        return $this->hasMany(DocumentEtablissement::class, 'demande_id');
    }

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }
}
