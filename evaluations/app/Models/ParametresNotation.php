<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametresNotation extends Modele
{
    use AppartientAuTenant;

    protected $table = 'parametres_notation';

    protected $hidden = ['id', 'tenant_id', 'grille_id'];

    protected $casts = [
        'decimales' => 'integer',
        'classement_actif' => 'boolean',
        'echelle_appreciation' => 'array',
        'delai_escalade_contestation_jours' => 'integer',
    ];

    public function grille(): BelongsTo
    {
        return $this->belongsTo(GrilleEvaluation::class, 'grille_id');
    }

    /** Règles transmises au CalculService. */
    public function regles(): array
    {
        $grille = $this->grille;

        return [
            'methode_moyenne' => $this->methode_moyenne,
            'decimales' => $this->decimales,
            'note_non_saisie' => $this->note_non_saisie,
            'absence_non_justifiee' => $this->absence_non_justifiee,
            'regle_rattrapage' => $this->regle_rattrapage,
            'type_notation' => $grille->type_notation,
            'note_min' => (string) $grille->note_min,
            'note_max' => (string) $grille->note_max,
            'echelle_appreciation' => $this->echelle_appreciation,
            'classement_actif' => $this->classement_actif && $grille->avec_classement,
        ];
    }
}
