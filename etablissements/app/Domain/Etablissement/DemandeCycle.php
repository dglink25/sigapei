<?php

namespace App\Domain\Etablissement;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

/**
 * Demande d'extension de cycle soumise par l'administrateur d'un établissement.
 * Une seule demande en attente par cycle et par établissement (contrainte unique).
 */
class DemandeCycle extends Model
{
    use GenereUuid;

    protected $table = 'demandes_cycle';

    protected $hidden = ['id', 'etablissement_id'];

    protected $fillable = [
        'etablissement_id', 'cycle', 'statut', 'motif',
        'note_instruction', 'instruit_par', 'date_instruction',
    ];

    protected $casts = [
        'date_instruction' => 'datetime',
    ];

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }
}
