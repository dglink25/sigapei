<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

/**
 * Configuration locale d'une matière (UUID externe evaluations.matieres)
 * dans un contexte pédagogique précis (année × niveau × série optionnelle).
 *
 * coefficient NULL = non défini ≠ coefficient 0.
 */
class MatiereConfig extends Model
{
    use GenereUuid;

    protected $table  = 'matieres_config';
    protected $hidden = ['id', 'etablissement_id', 'annee_id', 'niveau_id', 'serie_id'];

    protected $fillable = [
        'etablissement_id', 'annee_id', 'cycle', 'niveau_id', 'serie_id',
        'matiere_uuid_externe', 'nom_matiere', 'code_matiere',
        'coefficient', 'est_obligatoire', 'actif',
    ];
    protected $casts = [
        'coefficient'    => 'decimal:2',
        'est_obligatoire'=> 'boolean',
        'actif'          => 'boolean',
    ];

    public function annee()  { return $this->belongsTo(AnneeAcademique::class, 'annee_id'); }
    public function niveau() { return $this->belongsTo(NiveauScolaire::class, 'niveau_id'); }
    public function serie()  { return $this->belongsTo(SerieFiliere::class, 'serie_id'); }
}
