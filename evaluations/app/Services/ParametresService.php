<?php

namespace App\Services;

use App\Exceptions\MetierException;
use App\Models\GrilleEvaluation;
use App\Models\ParametresNotation;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/** Barèmes et règles de calcul par établissement/cycle (CDC §4, §5). */
class ParametresService
{
    public function __construct(private readonly CalculService $calcul) {}

    public function pour(string $cycle): ParametresNotation
    {
        return ParametresNotation::with('grille')->where('cycle', $cycle)->first()
            ?? throw MetierException::conflit(
                "Les règles de notation du cycle « {$cycle} » ne sont pas encore configurées par l'établissement.",
                'PARAMETRES_NON_CONFIGURES'
            );
    }

    /** Création ou mise à jour des règles d'un cycle, avec contrôle complet de l'échelle de mentions. */
    public function enregistrer(string $cycle, array $donnees, string $auteurUuid): ParametresNotation
    {
        $grille = GrilleEvaluation::visibles()->where('uuid', $donnees['grille_uuid'])->where('active', true)->first()
            ?? throw ValidationException::withMessages(['grille_uuid' => 'Barème introuvable ou inactif.']);

        if ($grille->cycle !== $cycle) {
            throw ValidationException::withMessages(['grille_uuid' => "Ce barème est prévu pour le cycle « {$grille->cycle} »."]);
        }

        try {
            $this->calcul->validerEchelle($donnees['echelle_appreciation'], (string) $grille->note_min, (string) $grille->note_max);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['echelle_appreciation' => $e->getMessage()]);
        }

        $echelle = array_map(fn ($t) => [
            'min' => (string) $t['min'],
            'max' => (string) $t['max'],
            'mention' => trim((string) $t['mention']),
        ], array_values($donnees['echelle_appreciation']));

        $parametres = ParametresNotation::firstOrNew(['cycle' => $cycle]);
        $parametres->fill([
            'methode_moyenne' => $donnees['methode_moyenne'] ?? $parametres->methode_moyenne ?? 'par_matiere',
            'decimales' => $donnees['decimales'] ?? $parametres->decimales ?? 2,
            'note_non_saisie' => $donnees['note_non_saisie'] ?? $parametres->note_non_saisie ?? 'exclure',
            'absence_non_justifiee' => $donnees['absence_non_justifiee'] ?? $parametres->absence_non_justifiee ?? 'zero',
            'regle_rattrapage' => $donnees['regle_rattrapage'] ?? $parametres->regle_rattrapage ?? 'meilleure',
            'classement_actif' => $donnees['classement_actif'] ?? $parametres->classement_actif ?? true,
            'delai_escalade_contestation_jours' => $donnees['delai_escalade_contestation_jours'] ?? $parametres->delai_escalade_contestation_jours ?? 7,
            'echelle_appreciation' => $echelle,
            'modifie_par_uuid' => $auteurUuid,
        ]);
        $parametres->grille_id = $grille->id;
        $parametres->save();

        return $parametres->load('grille');
    }
}
