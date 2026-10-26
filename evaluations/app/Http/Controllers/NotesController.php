<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Models\Evaluation;
use App\Models\Matiere;
use App\Models\Note;
use App\Models\Periode;
use App\Services\CalculService;
use App\Services\ControleAcces;
use App\Services\NoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Notes (CDC Tableau 7) : saisie, grille de classe, correction tracée. */
class NotesController extends Controller
{
    public function __construct(
        private readonly NoteService $notes,
        private readonly ControleAcces $acces,
    ) {}

    /**
     * POST /v1/notes - saisit ou met à jour une ou plusieurs notes d'une évaluation (grille façon tableur).
     * Une note existante ne se modifie qu'avec la `version` lue (pas d'écrasement silencieux).
     */
    public function saisir(Request $request): JsonResponse
    {
        $d = $request->validate([
            'evaluation_uuid' => ['required', 'uuid'],
            'notes' => ['required', 'array', 'min:1', 'max:200'],
            'notes.*.apprenant_uuid' => ['required', 'uuid', 'distinct'],
            'notes.*.statut' => ['required', Rule::in(CalculService::STATUTS)],
            'notes.*.valeur' => ['nullable', 'decimal:0,2', 'min:0', 'max:999'],
            'notes.*.niveau_competence' => ['nullable', 'string', 'max:10'],
            'notes.*.commentaire' => ['nullable', 'string', 'max:255'],
            'notes.*.version' => ['nullable', 'integer', 'min:1'],
        ]);

        $evaluation = Evaluation::where('uuid', $d['evaluation_uuid'])->firstOrFail();
        $notes = $this->notes->saisir($evaluation, array_map(
            fn ($n) => array_merge($n, isset($n['valeur']) ? ['valeur' => (string) $n['valeur']] : []),
            $d['notes']
        ));

        return $this->ok(array_map(fn (Note $n) => $this->presenter($n, $evaluation), $notes), 'Notes enregistrées.');
    }

    /** GET /v1/notes/classe/{uuid}?periode_uuid=&matiere_uuid= - grille des notes d'une classe. */
    public function parClasse(Request $request, string $classeUuid): JsonResponse
    {
        $d = $request->validate([
            'periode_uuid' => ['required', 'uuid'],
            'matiere_uuid' => [Rule::requiredIf(Contexte::role() === 'enseignant'), 'nullable', 'uuid'],
        ]);
        abort_unless(Str::isUuid($classeUuid), 404);

        $this->acces->gestionClasse($classeUuid, $d['matiere_uuid'] ?? null);

        $periode = Periode::where('uuid', $d['periode_uuid'])->firstOrFail();
        $evaluations = Evaluation::with('matiere:id,uuid,nom')
            ->where('periode_id', $periode->id)
            ->where('classe_uuid', $classeUuid)
            ->when($d['matiere_uuid'] ?? null, fn ($q, $m) => $q->whereIn('matiere_id', Matiere::where('uuid', $m)->select('id')))
            ->orderBy('date_evaluation')->orderBy('id')
            ->get();

        $notes = Note::whereIn('evaluation_id', $evaluations->pluck('id'))->get()->groupBy('evaluation_id');

        return $this->ok([
            'periode' => ['uuid' => $periode->uuid, 'libelle' => $periode->libelle, 'statut' => $periode->statut],
            'evaluations' => $evaluations->map(fn ($ev) => [
                'uuid' => $ev->uuid,
                'libelle' => $ev->libelle,
                'type' => $ev->type,
                'date_evaluation' => $ev->date_evaluation?->toDateString(),
                'coefficient' => $ev->coefficient,
                'note_sur' => $ev->note_sur,
                'matiere' => ['uuid' => $ev->matiere->uuid, 'nom' => $ev->matiere->nom],
                'saisie_verrouillee' => $ev->saisie_cloturee_le !== null,
                'notes' => ($notes->get($ev->id) ?? collect())->map(fn ($n) => $this->presenter($n, $ev))->values(),
            ])->values(),
        ]);
    }

    /** PUT /v1/notes/{uuid}/corriger - administrateur, motif obligatoire (CDC §9). */
    public function corriger(Request $request, Note $note): JsonResponse
    {
        $d = $request->validate([
            'statut' => ['required', Rule::in(CalculService::STATUTS)],
            'valeur' => ['nullable', 'decimal:0,2', 'min:0', 'max:999'],
            'niveau_competence' => ['nullable', 'string', 'max:10'],
            'motif' => ['required', 'string', 'min:10', 'max:1000'],
            'version' => ['required', 'integer', 'min:1'],
        ]);
        if (isset($d['valeur'])) {
            $d['valeur'] = (string) $d['valeur'];
        }

        $note = $this->notes->corriger($note, $d);

        return $this->ok($this->presenter($note, $note->evaluation), 'Note corrigée.');
    }

    private function presenter(Note $n, Evaluation $ev): array
    {
        return [
            'uuid' => $n->uuid,
            'evaluation_uuid' => $ev->uuid,
            'apprenant_uuid' => $n->apprenant_uuid,
            'statut' => $n->statut,
            'valeur' => $n->valeur,
            'niveau_competence' => $n->niveau_competence,
            'commentaire' => $n->commentaire,
            'version' => $n->version,
            'saisi_le' => $n->saisi_le?->toIso8601String(),
            'modifie_le' => $n->updated_at?->toIso8601String(),
        ];
    }
}
