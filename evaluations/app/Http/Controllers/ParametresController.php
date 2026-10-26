<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Models\GrilleEvaluation;
use App\Models\ModeleBulletin;
use App\Models\ParametresNotation;
use App\Services\CalculService;
use App\Services\ParametresService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Barèmes (grilles), règles de notation par cycle et modèles de bulletin (CDC §4, §5).
 * Endpoints de configuration ajoutés au Tableau 7 : sans eux, aucun calcul n'est paramétrable.
 */
class ParametresController extends Controller
{
    private const CYCLES = ['primaire', 'secondaire', 'universitaire'];

    public function __construct(
        private readonly ParametresService $parametres,
        private readonly CalculService $calcul,
    ) {}

    /** GET /v1/grilles - barèmes plateforme + barèmes de l'établissement. */
    public function grilles(Request $request): JsonResponse
    {
        $request->validate(['cycle' => ['nullable', Rule::in(self::CYCLES)]]);

        $grilles = GrilleEvaluation::visibles()
            ->where('active', true)
            ->when($request->query('cycle'), fn ($q, $c) => $q->where('cycle', $c))
            ->orderByRaw('tenant_id IS NOT NULL')->orderBy('nom')
            ->get()
            ->map(fn ($g) => $g->toArray() + ['origine' => $g->estPlateforme() ? 'plateforme' : 'etablissement']);

        return $this->ok($grilles);
    }

    /** POST /v1/grilles - barème propre à l'établissement (administrateur). */
    public function creerGrille(Request $request): JsonResponse
    {
        $d = $request->validate([
            'code' => ['required', 'string', 'max:60', 'regex:/^[a-z0-9_]+$/'],
            'nom' => ['required', 'string', 'max:150'],
            'cycle' => ['required', Rule::in(self::CYCLES)],
            'programme' => ['required', Rule::in(['beninois', 'francais', 'autre'])],
            'type_notation' => ['required', Rule::in(['chiffree', 'competences'])],
            'note_min' => ['required_if:type_notation,chiffree', 'nullable', 'decimal:0,2', 'min:0', 'max:999'],
            'note_max' => ['required_if:type_notation,chiffree', 'nullable', 'decimal:0,2', 'gt:note_min', 'max:999'],
            'avec_coefficients' => ['boolean'],
            'avec_classement' => ['boolean'],
            'niveaux_competence' => ['required_if:type_notation,competences', 'nullable', 'array', 'min:2', 'max:10'],
            'niveaux_competence.*.code' => ['required', 'string', 'max:10', 'distinct'],
            'niveaux_competence.*.libelle' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        if (GrilleEvaluation::where('tenant_id', Contexte::tenantId())->where('code', $d['code'])->exists()) {
            throw MetierException::conflit('Un barème avec ce code existe déjà.', 'CODE_DEJA_UTILISE');
        }

        $grille = new GrilleEvaluation(collect($d)->except([])->all() + [
            'note_min' => $d['note_min'] ?? '0',
            'note_max' => $d['note_max'] ?? '20',
        ]);
        $grille->tenant_id = Contexte::tenantId();
        $grille->save();

        return $this->ok($grille->fresh(), 'Barème créé.', 201);
    }

    /** GET /v1/parametres-notation/{cycle} */
    public function voir(string $cycle): JsonResponse
    {
        abort_unless(in_array($cycle, self::CYCLES, true), 404);
        $p = $this->parametres->pour($cycle);

        return $this->ok($p->toArray() + ['grille' => $p->grille]);
    }

    /** PUT /v1/parametres-notation/{cycle} (administrateur) */
    public function enregistrer(Request $request, string $cycle): JsonResponse
    {
        abort_unless(in_array($cycle, self::CYCLES, true), 404);

        $d = $request->validate([
            'grille_uuid' => ['required', 'uuid'],
            // Ex. {"interrogation": {"mode": "bloc", "poids": "1"}, "composition": {"mode": "individuel", "poids": "2"}}
            'ponderation_types' => ['sometimes', 'array:'.implode(',', array_keys(ParametresNotation::PONDERATION_DEFAUT))],
            'ponderation_types.*.mode' => ['required', Rule::in(['bloc', 'individuel'])],
            'ponderation_types.*.poids' => ['required', 'decimal:0,2', 'gt:0', 'max:99'],
            'decimales' => ['sometimes', 'integer', 'between:0,3'],
            'note_non_saisie' => ['sometimes', Rule::in(['exclure', 'zero'])],
            'absence_non_justifiee' => ['sometimes', Rule::in(['exclure', 'zero'])],
            'regle_rattrapage' => ['sometimes', Rule::in(['remplacer', 'meilleure', 'moyenne'])],
            'classement_actif' => ['sometimes', 'boolean'],
            'delai_escalade_contestation_jours' => ['sometimes', 'integer', 'between:1,90'],
            'echelle_appreciation' => ['required', 'array', 'min:1', 'max:20'],
            'echelle_appreciation.*.min' => ['required', 'decimal:0,2'],
            'echelle_appreciation.*.max' => ['required', 'decimal:0,2'],
            'echelle_appreciation.*.mention' => ['required', 'string', 'max:60'],
        ]);

        $p = $this->parametres->enregistrer($cycle, $d, Contexte::utilisateurUuid());

        return $this->ok($p->toArray() + ['grille' => $p->grille], 'Règles de notation enregistrées.');
    }

    /** POST /v1/modeles-bulletin - création ou mise à jour du modèle d'un cycle (CDC Tableau 7). */
    public function modele(Request $request): JsonResponse
    {
        $d = $request->validate([
            'cycle' => ['required', Rule::in(self::CYCLES)],
            'en_tete' => ['required', 'array'],
            'en_tete.titre' => ['required', 'string', 'max:150'],
            'en_tete.sous_titre' => ['nullable', 'string', 'max:150'],
            'en_tete.logo_document_uuid' => ['nullable', 'uuid'],
            'colonnes_affichees' => ['required', 'array', 'min:1'],
            'colonnes_affichees.*' => ['distinct', Rule::in(['matiere', 'coefficient', 'notes', 'moyenne', 'moyenne_classe', 'min_classe', 'max_classe', 'rang', 'appreciation'])],
            'mentions_bas_de_page' => ['nullable', 'string', 'max:2000'],
        ]);

        $modele = ModeleBulletin::firstOrNew(['cycle' => $d['cycle']]);
        $modele->fill([
            'en_tete' => $d['en_tete'],
            'colonnes_affichees' => array_values($d['colonnes_affichees']),
            'mentions_bas_de_page' => $d['mentions_bas_de_page'] ?? null,
            'modifie_par_uuid' => Contexte::utilisateurUuid(),
        ]);
        $nouveau = ! $modele->exists;
        $modele->save();

        return $this->ok($modele, 'Modèle de bulletin enregistré.', $nouveau ? 201 : 200);
    }
}
