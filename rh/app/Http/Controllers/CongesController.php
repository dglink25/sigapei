<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\Conge;
use App\Models\Personnel;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Congés du personnel : demande, consultation, validation par la direction.
 * Cycle `en_attente` → `approuvee` / `refusee` / `annulee` ; aucune suppression
 * physique. Le nombre de jours ouvrables est calculé à la demande.
 */
class CongesController extends Controller
{
    private const TYPES = ['annuel', 'maladie', 'maternite', 'paternite', 'exceptionnel', 'sans_solde'];

    private const TRANSITIONS = [
        'en_attente' => ['approuvee', 'refusee', 'annulee'],
        'approuvee' => ['annulee'],
        'refusee' => [],
        'annulee' => [],
    ];

    public function __construct(
        private readonly RabbitMqPublisher $publisher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'personnel_uuid' => ['nullable', 'uuid'],
            'statut' => ['nullable', Rule::in(array_keys(self::TRANSITIONS))],
            'type_conge' => ['nullable', Rule::in(self::TYPES)],
        ]);

        $conges = Conge::query()
            ->with('personnel.grade')
            ->when($request->filled('personnel_uuid'), function ($q) use ($request) {
                $q->whereHas('personnel', fn ($s) => $s->where('uuid', $request->query('personnel_uuid')));
            })
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->query('statut')))
            ->when($request->filled('type_conge'), fn ($q) => $q->where('type_conge', $request->query('type_conge')))
            ->orderByDesc('date_debut')
            ->paginate($this->parPage($request));

        return $this->page($conges);
    }

    public function voir(Conge $conge): JsonResponse
    {
        return $this->ok($conge->load('personnel.grade'));
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'personnel_uuid' => ['required', 'uuid'],
            'type_conge' => ['required', Rule::in(self::TYPES)],
            'date_debut' => ['required', 'date'],
            'date_fin' => ['required', 'date', 'after_or_equal:date_debut'],
            'motif' => ['nullable', 'string', 'max:1000'],
        ]);

        $personnel = Personnel::where('uuid', $d['personnel_uuid'])->first()
            ?? throw MetierException::introuvable('Membre du personnel introuvable.');

        $jours = $this->joursOuvrables($d['date_debut'], $d['date_fin']);
        if ($jours < 1) {
            throw MetierException::conflit('La période ne contient aucun jour ouvrable.', 'PERIODE_VIDE');
        }
        if ($jours > (int) config('rh.conges.jours_max_par_demande', 90)) {
            throw MetierException::conflit('Durée de congé supérieure au maximum autorisé.', 'DUREE_EXCESSIVE');
        }

        $chevauchement = Conge::where('personnel_id', $personnel->id)
            ->whereIn('statut', ['en_attente', 'approuvee'])
            ->where('date_debut', '<=', $d['date_fin'])
            ->where('date_fin', '>=', $d['date_debut'])
            ->exists();
        if ($chevauchement) {
            throw MetierException::conflit('Une demande de congé couvre déjà tout ou partie de cette période.', 'CONGE_CHEVAUCHANT');
        }

        unset($d['personnel_uuid']);
        $d['personnel_id'] = $personnel->id;
        $d['jours'] = $jours;
        $d['demandeur_uuid'] = Contexte::utilisateurUuid();

        $conge = Conge::create($d + ['statut' => 'en_attente']);

        $this->publisher->publier('rh.conge.demande', [
            'tenant_id' => Contexte::tenantId(),
            'conge_uuid' => $conge->uuid,
            'personnel_uuid' => $personnel->uuid,
        ]);

        return $this->ok($conge->fresh('personnel.grade'), 'Demande de congé enregistrée.', 201);
    }

    /**
     * PUT /v1/conges/{uuid}/traiter — validation ou refus par la direction.
     */
    public function traiter(Request $request, Conge $conge): JsonResponse
    {
        $d = $request->validate([
            'statut' => ['required', Rule::in(['approuvee', 'refusee', 'annulee'])],
            'commentaire' => ['nullable', 'string', 'max:1000'],
        ]);

        if (! in_array($d['statut'], self::TRANSITIONS[$conge->statut] ?? [], true)) {
            throw MetierException::conflit("Passage de « {$conge->statut} » à « {$d['statut']} » impossible.", 'TRANSITION_INTERDITE');
        }

        if ($d['statut'] === 'refusee' && trim((string) ($d['commentaire'] ?? '')) === '') {
            throw MetierException::conflit('Un motif est obligatoire pour refuser une demande de congé.', 'MOTIF_OBLIGATOIRE');
        }

        DB::transaction(function () use ($conge, $d) {
            $conge->statut = $d['statut'];
            $conge->commentaire_traitement = $d['commentaire'] ?? null;
            $conge->traitee_par_uuid = Contexte::utilisateurUuid();
            $conge->traitee_le = now();
            $conge->save();

            $this->publisher->publier('rh.conge.traite', [
                'tenant_id' => Contexte::tenantId(),
                'conge_uuid' => $conge->uuid,
                'statut' => $conge->statut,
            ]);
        });

        return $this->ok($conge->fresh('personnel.grade'), 'Demande de congé traitée.');
    }

    private function joursOuvrables(string $debut, string $fin): int
    {
        $d = Carbon::parse($debut)->startOfDay();
        $f = Carbon::parse($fin)->startOfDay();
        $jours = 0;
        for ($jour = $d->copy(); $jour->lte($f); $jour->addDay()) {
            if ($jour->isWeekday()) {
                $jours++;
            }
        }

        return $jours;
    }
}
