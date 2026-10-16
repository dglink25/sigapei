<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\Affectation;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Affectations personnel ↔ matière ↔ classe — SOURCE DE VÉRITÉ de la règle 5.
 *
 * `matiere_uuid` et `classe_uuid` sont des UUID EXTERNES (schémas
 * `evaluations.matieres` et `scolarite.classes`) : aucune FK locale (règle 4).
 * Ces endpoints sont aussi consommés en interne par E-learning, Évaluations et
 * Vie scolaire pour vérifier qu'un enseignant est bien affecté.
 */
class AffectationsController extends Controller
{
    public function __construct(
        private readonly RabbitMqPublisher $publisher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'personnel_uuid' => ['nullable', 'uuid'],
            'matiere_uuid' => ['nullable', 'uuid'],
            'classe_uuid' => ['nullable', 'uuid'],
            'annee_scolaire' => ['nullable', 'string', 'max:9'],
            'statut' => ['nullable', 'in:actif,termine'],
        ]);

        $affectations = Affectation::query()
            ->with('personnel.grade')
            ->when($request->filled('personnel_uuid'), function ($q) use ($request) {
                $q->whereHas('personnel', fn ($s) => $s->where('uuid', $request->query('personnel_uuid')));
            })
            ->when($request->filled('matiere_uuid'), fn ($q) => $q->where('matiere_uuid', $request->query('matiere_uuid')))
            ->when($request->filled('classe_uuid'), fn ($q) => $q->where('classe_uuid', $request->query('classe_uuid')))
            ->when($request->filled('annee_scolaire'), fn ($q) => $q->where('annee_scolaire', $request->query('annee_scolaire')))
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->query('statut')))
            ->orderByDesc('created_at')
            ->paginate($this->parPage($request));

        return $this->page($affectations);
    }

    public function voir(Affectation $affectation): JsonResponse
    {
        return $this->ok($affectation->load('personnel.grade'));
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'personnel_uuid' => ['required', 'uuid'],
            'matiere_uuid' => ['required', 'uuid'],
            'classe_uuid' => ['required', 'uuid'],
            'annee_scolaire' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
            'heures_semaine' => ['nullable', 'integer', 'min:1', 'max:60'],
            'date_debut' => ['nullable', 'date'],
            'date_fin' => ['nullable', 'date', 'after_or_equal:date_debut'],
        ]);

        $personnel = Personnel::where('uuid', $d['personnel_uuid'])->first()
            ?? throw MetierException::introuvable('Membre du personnel introuvable.');

        if (! $personnel->actif) {
            throw MetierException::conflit('Ce membre du personnel est inactif : aucune affectation possible.', 'PERSONNEL_INACTIF');
        }

        unset($d['personnel_uuid']);
        $d['personnel_id'] = $personnel->id;

        $existe = Affectation::where('personnel_id', $personnel->id)
            ->where('matiere_uuid', $d['matiere_uuid'])
            ->where('classe_uuid', $d['classe_uuid'])
            ->where('annee_scolaire', $d['annee_scolaire'])
            ->where('statut', 'actif')
            ->exists();

        if ($existe) {
            throw MetierException::conflit('Cette affectation existe déjà pour cette année scolaire.', 'AFFECTATION_DEJA_ACTIVE');
        }

        $affectation = Affectation::create($d + ['statut' => 'actif']);

        $this->publisher->publier('rh.affectation.cree', [
            'tenant_id' => Contexte::tenantId(),
            'affectation_uuid' => $affectation->uuid,
            'personnel_uuid' => $personnel->uuid,
            'matiere_uuid' => $affectation->matiere_uuid,
            'classe_uuid' => $affectation->classe_uuid,
        ]);

        return $this->ok($affectation->fresh('personnel.grade'), 'Affectation créée.', 201);
    }

    public function modifier(Request $request, Affectation $affectation): JsonResponse
    {
        $d = $request->validate([
            'heures_semaine' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:60'],
            'date_debut' => ['sometimes', 'nullable', 'date'],
            'date_fin' => ['sometimes', 'nullable', 'date'],
        ]);

        $debut = $d['date_debut'] ?? $affectation->date_debut;
        $fin = $d['date_fin'] ?? $affectation->date_fin;
        if ($fin !== null && $debut !== null && $fin < $debut) {
            throw MetierException::conflit('La date de fin ne peut pas précéder la date de début.', 'DATES_INCOHERENTES');
        }

        $affectation->update($d);

        return $this->ok($affectation->fresh('personnel.grade'), 'Affectation mise à jour.');
    }

    /**
     * POST /v1/affectations/{uuid}/cloturer — termine l'affectation (jamais de suppression).
     */
    public function cloturer(Affectation $affectation): JsonResponse
    {
        if ($affectation->statut === 'termine') {
            throw MetierException::conflit('Cette affectation est déjà terminée.', 'AFFECTATION_DEJA_TERMINEE');
        }

        $affectation->statut = 'termine';
        $affectation->date_fin = $affectation->date_fin ?? now()->toDateString();
        $affectation->save();

        $this->publisher->publier('rh.affectation.cloture', [
            'tenant_id' => Contexte::tenantId(),
            'affectation_uuid' => $affectation->uuid,
        ]);

        return $this->ok($affectation->fresh('personnel.grade'), 'Affectation clôturée.');
    }
}
