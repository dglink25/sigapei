<?php

namespace App\Http\Controllers;

use App\Exceptions\MetierException;
use App\Models\Periode;
use App\Services\BulletinService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Périodes d'évaluation (CDC §6.2) et clôture (CDC §8.1, Tableau 7). */
class PeriodesController extends Controller
{
    public function __construct(private readonly BulletinService $bulletins) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'annee_scolaire' => ['nullable', 'regex:/^\d{4}-\d{4}$/'],
            'cycle' => ['nullable', Rule::in(['primaire', 'secondaire', 'universitaire'])],
        ]);

        return $this->page(
            Periode::when($request->query('annee_scolaire'), fn ($q, $a) => $q->where('annee_scolaire', $a))
                ->when($request->query('cycle'), fn ($q, $c) => $q->where('cycle', $c))
                ->orderByDesc('annee_scolaire')->orderBy('cycle')->orderBy('numero')
                ->paginate($this->parPage($request))
        );
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'annee_scolaire' => ['required', 'regex:/^\d{4}-\d{4}$/'],
            'cycle' => ['required', Rule::in(['primaire', 'secondaire', 'universitaire'])],
            'type' => ['required', Rule::in(['trimestre', 'semestre'])],
            'numero' => ['required', 'integer', 'between:1,3'],
            'libelle' => ['required', 'string', 'max:60'],
            'date_debut' => ['required', 'date_format:Y-m-d'],
            'date_fin' => ['required', 'date_format:Y-m-d', 'after:date_debut'],
        ]);

        [$debut, $fin] = array_map('intval', explode('-', $d['annee_scolaire']));
        if ($fin !== $debut + 1) {
            throw MetierException::conflit("L'année scolaire doit être de la forme 2026-2027.", 'ANNEE_INVALIDE');
        }
        if ($d['type'] === 'semestre' && $d['numero'] > 2) {
            throw MetierException::conflit('Un semestre est numéroté 1 ou 2.', 'NUMERO_INVALIDE');
        }

        $chevauchement = Periode::where('annee_scolaire', $d['annee_scolaire'])->where('cycle', $d['cycle'])
            ->where('date_debut', '<=', $d['date_fin'])->where('date_fin', '>=', $d['date_debut'])->exists();
        if ($chevauchement) {
            throw MetierException::conflit('Ces dates chevauchent une autre période du même cycle.', 'PERIODES_CHEVAUCHEMENT');
        }
        if (Periode::where('annee_scolaire', $d['annee_scolaire'])->where('cycle', $d['cycle'])->where('type', $d['type'])->where('numero', $d['numero'])->exists()) {
            throw MetierException::conflit('Cette période existe déjà.', 'PERIODE_EXISTANTE');
        }

        return $this->ok(Periode::create($d)->fresh(), 'Période créée.', 201);
    }

    /** POST /v1/periodes/{uuid}/cloturer — 202 : calcul et archivage en tâche de fond. */
    public function cloturer(Periode $periode): JsonResponse
    {
        $this->bulletins->demanderCloture($periode);

        return $this->ok(['periode_uuid' => $periode->uuid, 'statut' => $periode->fresh()->statut], 'Clôture lancée : les bulletins sont en cours d\'archivage.', 202);
    }
}
