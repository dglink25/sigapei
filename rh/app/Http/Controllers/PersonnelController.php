<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\Grade;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestion du personnel d'un établissement (CDC RH).
 *
 * Aucune suppression physique : un départ passe par `statut=inactif`/`retraite`
 * (règle transverse plateforme). L'`id` interne n'est jamais exposé : les routes
 * et références croisées utilisent `uuid`.
 */
class PersonnelController extends Controller
{
    public function __construct(
        private readonly RabbitMqPublisher $publisher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'type_personnel' => ['nullable', Rule::in(config('rh.types_personnel'))],
            'statut' => ['nullable', Rule::in(config('rh.statuts_personnel'))],
            'actifs' => ['nullable', 'boolean'],
            'recherche' => ['nullable', 'string', 'max:100'],
        ]);

        $personnel = Personnel::query()
            ->with('grade')
            ->when($request->filled('type_personnel'), fn ($q) => $q->where('type_personnel', $request->query('type_personnel')))
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->query('statut')))
            ->when($request->boolean('actifs'), fn ($q) => $q->where('actif', true))
            ->when($request->filled('recherche'), function ($q) use ($request) {
                $terme = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $request->query('recherche')).'%';
                $q->where(fn ($s) => $s
                    ->where('nom', 'ilike', $terme)
                    ->orWhere('prenom', 'ilike', $terme)
                    ->orWhere('matricule', 'ilike', $terme)
                    ->orWhere('email', 'ilike', $terme));
            })
            ->orderBy('nom')->orderBy('prenom')
            ->paginate($this->parPage($request));

        return $this->page($personnel);
    }

    public function voir(Personnel $personnel): JsonResponse
    {
        return $this->ok($personnel->load(['grade', 'contrats.grade', 'affectations', 'conges', 'rolesRh']));
    }

    /** GET /v1/personnel/{uuid}/affectations - affectations classes/matières d'un enseignant. */
    public function affectations(Request $request, Personnel $personnel): JsonResponse
    {
        $request->validate([
            'annee_scolaire' => ['nullable', 'string', 'max:9'],
            'statut' => ['nullable', 'in:actif,termine'],
        ]);

        $affectations = $personnel->affectations()
            ->with('personnel.grade')
            ->when($request->filled('annee_scolaire'), fn ($q) => $q->where('annee_scolaire', $request->query('annee_scolaire')))
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->query('statut')))
            ->orderByDesc('created_at')
            ->paginate($this->parPage($request));

        return $this->page($affectations);
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'utilisateur_uuid' => ['nullable', 'uuid'],
            'matricule' => ['required', 'string', 'max:40'],
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:190'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'sexe' => ['nullable', Rule::in(['M', 'F'])],
            'date_naissance' => ['nullable', 'date', 'before:today'],
            'lieu_naissance' => ['nullable', 'string', 'max:150'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'type_personnel' => ['required', Rule::in(config('rh.types_personnel'))],
            'fonction' => ['nullable', 'string', 'max:150'],
            'grade_uuid' => ['nullable', 'uuid'],
            'date_embauche' => ['nullable', 'date'],
            'statut' => ['nullable', Rule::in(config('rh.statuts_personnel'))],
        ]);

        if (Personnel::where('matricule', $d['matricule'])->exists()) {
            throw MetierException::conflit('Un membre du personnel avec ce matricule existe déjà.', 'MATRICULE_DEJA_UTILISE');
        }

        $gradeUuid = $d['grade_uuid'] ?? null;
        unset($d['grade_uuid']);
        if ($gradeUuid !== null) {
            $d['grade_id'] = $this->resoudreGrade($gradeUuid);
        }

        $personnel = Personnel::create($d + ['actif' => ($d['statut'] ?? 'actif') === 'actif']);

        $this->publisher->publier('rh.personnel.cree', [
            'tenant_id' => Contexte::tenantId(),
            'personnel_uuid' => $personnel->uuid,
            'type_personnel' => $personnel->type_personnel,
        ]);

        return $this->ok($personnel->fresh('grade'), 'Membre du personnel créé.', 201);
    }

    public function modifier(Request $request, Personnel $personnel): JsonResponse
    {
        $d = $request->validate([
            'utilisateur_uuid' => ['sometimes', 'nullable', 'uuid'],
            'nom' => ['sometimes', 'string', 'max:100'],
            'prenom' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'telephone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'sexe' => ['sometimes', 'nullable', Rule::in(['M', 'F'])],
            'date_naissance' => ['sometimes', 'nullable', 'date', 'before:today'],
            'lieu_naissance' => ['sometimes', 'nullable', 'string', 'max:150'],
            'adresse' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type_personnel' => ['sometimes', Rule::in(config('rh.types_personnel'))],
            'fonction' => ['sometimes', 'nullable', 'string', 'max:150'],
            'grade_uuid' => ['sometimes', 'nullable', 'uuid'],
            'date_embauche' => ['sometimes', 'nullable', 'date'],
        ]);

        if (array_key_exists('grade_uuid', $d)) {
            $personnel->grade_id = $d['grade_uuid'] !== null ? $this->resoudreGrade($d['grade_uuid']) : null;
            unset($d['grade_uuid']);
        }

        $personnel->update($d);

        return $this->ok($personnel->fresh('grade'), 'Membre du personnel mis à jour.');
    }

    /**
     * POST /v1/personnel/{uuid}/statut - change le statut (départ, suspension, retraite).
     * Remplace toute suppression physique (règle transverse plateforme).
     */
    public function changerStatut(Request $request, Personnel $personnel): JsonResponse
    {
        $d = $request->validate([
            'statut' => ['required', Rule::in(config('rh.statuts_personnel'))],
            'motif' => ['nullable', 'string', 'max:500'],
        ]);

        $personnel->statut = $d['statut'];
        $personnel->actif = $d['statut'] === 'actif';
        $personnel->save();

        $this->publisher->publier('rh.personnel.statut.change', [
            'tenant_id' => Contexte::tenantId(),
            'personnel_uuid' => $personnel->uuid,
            'statut' => $personnel->statut,
        ]);

        return $this->ok($personnel->fresh('grade'), 'Statut du membre mis à jour.');
    }

    private function resoudreGrade(string $gradeUuid): int
    {
        $grade = Grade::where('uuid', $gradeUuid)->first();
        if ($grade === null) {
            throw MetierException::introuvable('Grade introuvable.');
        }

        return $grade->id;
    }
}
