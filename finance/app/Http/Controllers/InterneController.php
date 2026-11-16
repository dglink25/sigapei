<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Models\PaiementEnLigne;
use App\Services\PaiementsEnLigne;
use App\Services\Soldes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Routes /v1/interne/* (secret interne, jamais exposées au front par la Gateway).
 * L'uuid d'un apprenant est unique sur la plateforme : il suffit à retrouver ses factures ; si l'appelant
 * transmet X-Tenant-Id (uuid de l'établissement), la recherche est en plus restreinte à cet établissement.
 */
class InterneController extends Controller
{
    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

    /** Utilisateur technique des traitements déclenchés par un autre service (journal d'audit). */
    public const SYSTEME = ['uuid' => '00000000-0000-0000-0000-000000000000', 'roleCode' => 'systeme'];

    public function __construct(
        private readonly Soldes $soldes,
        private readonly PaiementsEnLigne $paiements,
    ) {}

    /** GET /v1/interne/solde/{apprenant_uuid} - utilisé par Demandes (règle « solde à jour »). */
    public function solde(Request $request, string $apprenant): JsonResponse
    {
        $apprenant = strtolower($apprenant);
        $situations = $this->parEtablissement($request, $apprenant, fn () => $this->soldes->apprenant($apprenant));

        return $this->ok($this->cumuler($apprenant, $situations));
    }

    /**
     * GET /v1/interne/apprenants/paiements?apprenant_uuid= - vue consolidée lue par Scolarité
     * (champs total_du, total_regle, solde_restant, statut_global, nombre_factures, factures).
     */
    public function situationApprenant(Request $request): JsonResponse
    {
        $d = $request->validate(['apprenant_uuid' => ['required', 'uuid']]);
        $apprenant = strtolower($d['apprenant_uuid']);
        $resultats = $this->parEtablissement($request, $apprenant, fn () => [
            'solde' => $this->soldes->apprenant($apprenant),
            'factures' => $this->soldes->factures($apprenant),
        ]);
        if ($resultats === []) {
            return response()->json(['success' => false, 'message' => 'Aucune facture émise pour cet apprenant.', 'error' => ['code' => 'RESSOURCE_INTROUVABLE']], 404);
        }

        $s = $this->cumuler($apprenant, array_column($resultats, 'solde'));
        $factures = array_merge(...array_map(fn ($r) => array_map(fn ($f) => [
            'uuid' => $f->uuid,
            'numero' => $f->numero,
            'libelle' => $f->libelle,
            'montant' => (int) $f->montant_total,
            'regle' => (int) $f->montant_regle,
            'reste' => (int) $f->montant_total - (int) $f->montant_regle,
            'echeance' => $f->prochaine_echeance,
            'statut' => $f->statut,
        ], $r['factures']), $resultats));

        return $this->ok([
            'total_du' => $s['total_facture'],
            'total_regle' => $s['total_regle'],
            'solde_restant' => $s['reste_a_payer'],
            'statut_global' => $s['reste_a_payer'] === 0 ? 'SOLDE' : ($s['a_jour'] ? 'A_JOUR' : 'EN_RETARD'),
            'nombre_factures' => $s['nombre_factures'],
            'devise' => $s['devise'],
            'factures' => $factures,
        ]);
    }

    /** POST /v1/interne/paiements/notification {encaissement_uuid} - Paiement signale un changement d'état. */
    public function notificationPaiement(Request $request): JsonResponse
    {
        $d = $request->validate(['encaissement_uuid' => ['required', 'uuid']]);
        $p = PaiementEnLigne::withoutGlobalScopes()->where('encaissement_uuid', strtolower($d['encaissement_uuid']))->first();
        if ($p === null) {
            return response()->json(['success' => false, 'message' => 'Encaissement inconnu de Finances.', 'error' => ['code' => 'RESSOURCE_INTROUVABLE']], 404);
        }

        // Finances ne croit pas la notification : il relit l'encaissement chez Paiement avant toute écriture.
        $etab = (string) $p->etablissement_uuid;
        $p = Contexte::executerPour($etab, fn () => $this->paiements->synchroniser(PaiementEnLigne::whereKey($p->id)->firstOrFail()),
            self::SYSTEME + ['etablissement' => $etab]);

        return $this->ok(['statut' => $p->statut], 'Notification prise en compte.');
    }

    /** @return list<mixed> résultat du traitement pour chaque établissement où l'apprenant a des factures */
    private function parEtablissement(Request $request, string $apprenant, callable $traitement): array
    {
        $entete = strtolower((string) $request->header('X-Tenant-Id', ''));
        $etabs = DB::table('finances.factures')->where('apprenant_uuid', $apprenant)
            ->when(preg_match(self::UUID, $entete) === 1, fn ($q) => $q->where('etablissement_uuid', $entete))
            ->distinct()->orderBy('etablissement_uuid')->pluck('etablissement_uuid')->all();

        return array_map(fn ($e) => Contexte::executerPour((string) $e, $traitement), $etabs);
    }

    private function cumuler(string $apprenant, array $situations): array
    {
        $somme = fn (string $c) => array_sum(array_column($situations, $c));
        $retards = array_filter(array_column($situations, 'en_retard_depuis'));

        return [
            'apprenant_uuid' => $apprenant,
            'devise' => $situations[0]['devise'] ?? 'XOF',
            'nombre_factures' => $somme('nombre_factures'),
            'total_facture' => $somme('total_facture'),
            'total_regle' => $somme('total_regle'),
            'reste_a_payer' => $somme('reste_a_payer'),
            'montant_echu_impaye' => $somme('montant_echu_impaye'),
            'en_retard_depuis' => $retards === [] ? null : min($retards),
            'a_jour' => $somme('montant_echu_impaye') === 0,
        ];
    }
}
