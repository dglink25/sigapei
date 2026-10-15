<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Models\ContestationNote;
use App\Models\Evaluation;
use App\Models\Note;
use App\Services\ContestationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Contestations de notes (CDC §9). */
class ContestationsController extends Controller
{
    public function __construct(private readonly ContestationService $contestations) {}

    /** POST /v1/contestations — apprenant ou parent rattaché. */
    public function ouvrir(Request $request): JsonResponse
    {
        $d = $request->validate([
            'note_uuid' => ['required', 'uuid'],
            'motif' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        return $this->ok($this->contestations->ouvrir($d['note_uuid'], $d['motif']), 'Contestation enregistrée.', 201);
    }

    /** GET /v1/contestations — enseignant : celles de ses évaluations ; administrateur : toutes ; demandeur : les siennes. */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['statut' => ['nullable', Rule::in(['ouverte', 'en_examen', 'resolue', 'rejetee'])]]);

        $requete = ContestationNote::query()
            ->with('note:id,uuid,apprenant_uuid,evaluation_id,valeur,statut', 'note.evaluation:id,uuid,libelle,enseignant_uuid')
            ->when($request->query('statut'), fn ($q, $s) => $q->where('statut', $s))
            ->orderByDesc('ouverte_le');

        match (Contexte::role()) {
            'enseignant' => $requete->whereIn('note_id', Note::select('id')->whereIn(
                'evaluation_id', Evaluation::select('id')->where('enseignant_uuid', Contexte::utilisateurUuid())
            )),
            'apprenant', 'parent' => $requete->where('demandeur_uuid', Contexte::utilisateurUuid()),
            default => null,
        };

        return $this->page($requete->paginate($this->parPage($request)));
    }

    /** PUT /v1/contestations/{uuid}/traiter — enseignant de l'évaluation ou administrateur. */
    public function traiter(Request $request, ContestationNote $contestation): JsonResponse
    {
        $d = $request->validate([
            'statut' => ['required', Rule::in(['en_examen', 'resolue', 'rejetee'])],
            'reponse' => ['nullable', 'string', 'max:2000'],
        ]);

        return $this->ok($this->contestations->traiter($contestation, $d['statut'], $d['reponse'] ?? null), 'Contestation mise à jour.');
    }
}
