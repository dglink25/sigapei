<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Models\Evaluation;
use App\Models\Matiere;
use App\Models\Periode;
use App\Services\ControleAcces;
use App\Services\EvaluationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Évaluations (CDC §6, Tableau 7). */
class EvaluationsController extends Controller
{
    public const TYPES = ['devoir_surveille', 'interrogation', 'composition', 'examen_officiel', 'evaluation_competence', 'note_elearning'];

    public function __construct(
        private readonly EvaluationService $evaluations,
        private readonly ControleAcces $acces,
    ) {}

    /** GET /v1/evaluations?classe_uuid=&periode_uuid=[&matiere_uuid=] */
    public function index(Request $request): JsonResponse
    {
        $d = $request->validate([
            'classe_uuid' => ['required', 'uuid'],
            'periode_uuid' => ['required', 'uuid'],
            'matiere_uuid' => ['nullable', 'uuid'],
        ]);

        $this->acces->gestionClasse($d['classe_uuid'], $d['matiere_uuid'] ?? null);

        $periode = Periode::where('uuid', $d['periode_uuid'])->firstOrFail();
        $requete = Evaluation::with(['matiere:id,uuid,nom,code', 'rattrapageDe:id,uuid'])
            ->where('periode_id', $periode->id)
            ->where('classe_uuid', $d['classe_uuid'])
            ->when($d['matiere_uuid'] ?? null, fn ($q, $m) => $q->whereIn('matiere_id', Matiere::where('uuid', $m)->select('id')))
            ->when(Contexte::role() === 'enseignant', fn ($q) => $q->where('enseignant_uuid', Contexte::utilisateurUuid()))
            ->orderBy('date_evaluation');

        return $this->page($requete->paginate($this->parPage($request)));
    }

    /** POST /v1/evaluations */
    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'periode_uuid' => ['required', 'uuid'],
            'matiere_uuid' => ['required', 'uuid'],
            'classe_uuid' => ['required', 'uuid'],
            'enseignant_uuid' => [Rule::requiredIf(Contexte::role() === 'administrateur'), 'nullable', 'uuid'],
            'type' => ['required', Rule::in(self::TYPES)],
            'libelle' => ['required', 'string', 'max:150'],
            'date_evaluation' => ['required', 'date_format:Y-m-d'],
            'coefficient' => ['nullable', 'decimal:0,2', 'gt:0', 'max:99'],
            'note_sur' => ['nullable', 'decimal:0,2', 'gt:0', 'max:999'],
            'rattrapage_de_uuid' => ['nullable', 'uuid'],
        ]);

        return $this->ok($this->evaluations->creer($d), 'Évaluation créée.', 201);
    }

    /** POST /v1/evaluations/{uuid}/verrouiller — l'enseignant verrouille sa saisie (CDC §8.1). */
    public function verrouiller(Evaluation $evaluation): JsonResponse
    {
        return $this->ok($this->evaluations->verrouillerSaisie($evaluation), 'Saisie verrouillée.');
    }
}
