<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametresNotation extends Modele
{
    use AppartientAuTenant;

    protected $table = 'parametres_notation';

    protected $hidden = ['id', 'tenant_id', 'grille_id'];

    /** Défaut béninois : (moyenne des interrogations + chaque devoir + chaque composition) / nombre d'éléments. */
    public const PONDERATION_DEFAUT = [
        'interrogation' => ['mode' => 'bloc', 'poids' => '1'],
        'devoir_surveille' => ['mode' => 'individuel', 'poids' => '1'],
        'composition' => ['mode' => 'individuel', 'poids' => '1'],
        'examen_officiel' => ['mode' => 'individuel', 'poids' => '1'],
        'evaluation_competence' => ['mode' => 'individuel', 'poids' => '1'],
        'composition_en_ligne' => ['mode' => 'individuel', 'poids' => '1'],
        'note_elearning' => ['mode' => 'individuel', 'poids' => '1'],
    ];

    protected $casts = [
        'ponderation_types' => 'array',
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
            'ponderation_types' => array_replace(self::PONDERATION_DEFAUT, $this->ponderation_types ?? []),
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
