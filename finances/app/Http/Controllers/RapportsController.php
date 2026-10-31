<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\ScolariteClient;
use App\Services\Gouvernance;
use App\Services\Soldes;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RapportsController extends Controller
{
    public function __construct(
        private readonly Soldes $soldes,
        private readonly Gouvernance $gouvernance,
        private readonly ScolariteClient $scolarite,
    ) {}

    /** GET /v1/rapports/synthese?du=&au= (366 jours au plus ; par défaut le mois en cours). */
    public function synthese(Request $request): JsonResponse
    {
        $this->gouvernance->exiger('consulter_rapports');
        $d = $request->validate([
            'du' => ['nullable', 'date_format:Y-m-d'],
            'au' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:du'],
        ]);
        $du = CarbonImmutable::parse($d['du'] ?? now()->startOfMonth()->toDateString());
        $au = CarbonImmutable::parse($d['au'] ?? now()->toDateString());
        if ($du->diffInDays($au) > 366) {
            throw ValidationException::withMessages(['au' => 'La période ne peut pas dépasser un an.']);
        }

        return $this->ok($this->soldes->synthese($du->toDateString(), $au->toDateString()));
    }

    /** GET /v1/apprenants/{uuid}/solde - gestionnaire, ou l'apprenant / ses parents. */
    public function soldeApprenant(string $apprenant): JsonResponse
    {
        if (! $this->gouvernance->peut('consulter_finances')) {
            $a = in_array(Contexte::role(), ['apprenant', 'parent'], true) ? $this->scolarite->apprenant($apprenant) : null;
            if ($a === null || $this->scolarite->lien($a, Contexte::utilisateurUuid()) === null) {
                throw MetierException::introuvable('Apprenant introuvable.');
            }
        }

        return $this->ok($this->soldes->apprenant(strtolower($apprenant)));
    }

    /** GET /v1/journal - journal d'audit (administrateur), filtrable par action et cible. */
    public function journal(Request $request): JsonResponse
    {
        $this->gouvernance->exigerAdministrateur();
        $d = $request->validate([
            'action' => ['nullable', 'string', 'max:60'],
            'cible_uuid' => ['nullable', 'uuid'],
        ]);
        $p = DB::table('finances.journal_audit')->where('etablissement_uuid', Contexte::etablissement())
            ->when($d['action'] ?? null, fn ($q, $v) => $q->where('action', $v))
            ->when($d['cible_uuid'] ?? null, fn ($q, $v) => $q->where('cible_uuid', $v))
            ->orderByDesc('id')
            ->paginate($this->parPage($request), ['action', 'cible_type', 'cible_uuid', 'auteur_uuid', 'auteur_role', 'details', 'cree_le']);

        return $this->page($p, fn ($l) => [
            'action' => $l->action, 'cible_type' => $l->cible_type, 'cible_uuid' => $l->cible_uuid,
            'auteur_uuid' => $l->auteur_uuid, 'auteur_role' => $l->auteur_role,
            'details' => json_decode($l->details, true), 'le' => CarbonImmutable::parse($l->cree_le)->toIso8601String(),
        ]);
    }
}
