<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\Contrat;
use App\Models\Grade;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Contrats de travail du personnel. Un seul contrat actif (sans date de fin) par
 * membre : l'index unique partiel de la base le garantit, le service traduit le
 * conflit en erreur métier claire.
 */
class ContratsController extends Controller
{
    public function __construct(
        private readonly RabbitMqPublisher $publisher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'personnel_uuid' => ['nullable', 'uuid'],
            'statut' => ['nullable', Rule::in(['actif', 'termine', 'resilie', 'suspendu'])],
        ]);

        $contrats = Contrat::query()
            ->with(['personnel.grade', 'grade'])
            ->when($request->filled('personnel_uuid'), function ($q) use ($request) {
                $q->whereHas('personnel', fn ($s) => $s->where('uuid', $request->query('personnel_uuid')));
            })
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->query('statut')))
            ->orderByDesc('date_debut')
            ->paginate($this->parPage($request));

        return $this->page($contrats);
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'personnel_uuid' => ['required', 'uuid'],
            'grade_uuid' => ['nullable', 'uuid'],
            'type_contrat' => ['required', 'string', 'max:30'],
            'reference' => ['nullable', 'string', 'max:60'],
            'date_debut' => ['required', 'date'],
            'date_fin' => ['nullable', 'date', 'after_or_equal:date_debut'],
            'quotite' => ['nullable', 'integer', 'min:1', 'max:100'],
            'salaire_base' => ['nullable', 'decimal:0,2', 'min:0'],
            'devise' => ['nullable', 'string', 'size:3'],
        ]);

        $personnel = Personnel::where('uuid', $d['personnel_uuid'])->first()
            ?? throw MetierException::introuvable('Membre du personnel introuvable.');

        unset($d['personnel_uuid']);
        $d['personnel_id'] = $personnel->id;

        if (! empty($d['grade_uuid'])) {
            $d['grade_id'] = $this->resoudreGrade($d['grade_uuid']);
        }
        unset($d['grade_uuid']);

        // Un seul contrat actif sans date de fin par membre.
        if (empty($d['date_fin']) && Contrat::where('personnel_id', $personnel->id)
            ->where('est_actif', true)->whereNull('date_fin')->exists()) {
            throw MetierException::conflit('Ce membre a déjà un contrat en cours non clôturé.', 'CONTRAT_ACTIF_EXISTANT');
        }

        $contrat = Contrat::create($d + ['est_actif' => empty($d['date_fin']), 'statut' => 'actif']);

        $this->publisher->publier('rh.contrat.cree', [
            'tenant_id' => Contexte::tenantId(),
            'contrat_uuid' => $contrat->uuid,
            'personnel_uuid' => $personnel->uuid,
        ]);

        return $this->ok($contrat->fresh(['personnel.grade', 'grade']), 'Contrat créé.', 201);
    }

    public function modifier(Request $request, Contrat $contrat): JsonResponse
    {
        $d = $request->validate([
            'grade_uuid' => ['sometimes', 'nullable', 'uuid'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:60'],
            'date_fin' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_debut'],
            'quotite' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'salaire_base' => ['sometimes', 'nullable', 'decimal:0,2', 'min:0'],
            'devise' => ['sometimes', 'string', 'size:3'],
        ]);

        if (array_key_exists('grade_uuid', $d)) {
            $contrat->grade_id = $d['grade_uuid'] !== null ? $this->resoudreGrade($d['grade_uuid']) : null;
            unset($d['grade_uuid']);
        }

        $contrat->update($d);

        return $this->ok($contrat->fresh(['personnel.grade', 'grade']), 'Contrat mis à jour.');
    }

    /**
     * POST /v1/contrats/{uuid}/cloturer — met fin au contrat (jamais de suppression).
     */
    public function cloturer(Request $request, Contrat $contrat): JsonResponse
    {
        $d = $request->validate([
            'date_fin' => ['required', 'date', 'after_or_equal:date_debut'],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $contrat->est_actif) {
            throw MetierException::conflit('Ce contrat est déjà clôturé.', 'CONTRAT_DEJA_CLOTURE');
        }

        $contrat->date_fin = $d['date_fin'];
        $contrat->est_actif = false;
        $contrat->statut = 'termine';
        $contrat->save();

        $this->publisher->publier('rh.contrat.cloture', [
            'tenant_id' => Contexte::tenantId(),
            'contrat_uuid' => $contrat->uuid,
        ]);

        return $this->ok($contrat->fresh(['personnel.grade', 'grade']), 'Contrat clôturé.');
    }

    private function resoudreGrade(string $gradeUuid): int
    {
        $grade = Grade::where('uuid', $gradeUuid)->first()
            ?? throw MetierException::introuvable('Grade introuvable.');

        return $grade->id;
    }
}
