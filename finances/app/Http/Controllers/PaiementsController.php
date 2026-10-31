<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Integrations\PaiementClient;
use App\Models\Facture;
use App\Models\PaiementEnLigne;
use App\Services\Gouvernance;
use App\Services\PaiementsEnLigne;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Paiement en ligne d'une facture, exécuté par le microservice Paiement. */
class PaiementsController extends Controller
{
    public function __construct(
        private readonly PaiementsEnLigne $paiements,
        private readonly Gouvernance $gouvernance,
        private readonly FacturesController $factures,
    ) {}

    /** POST /v1/factures/{uuid}/paiements {montant, url_retour?} → URL de paiement de l'agrégateur. */
    public function initier(Request $request, Facture $facture): JsonResponse
    {
        $this->factures->exigerLecture($facture);
        $d = $request->validate([
            'montant' => ['required', 'integer', 'min:100', 'max:100000000000'],
            'url_retour' => ['nullable', 'url:https,http', 'max:500'],
        ]);
        if (isset($d['url_retour']) && ! $this->origineAutorisee($d['url_retour'])) {
            throw ValidationException::withMessages(['url_retour' => "L'adresse de retour n'appartient pas à la plateforme."]);
        }

        $p = $this->paiements->initier($facture, (int) $d['montant'], $d['url_retour'] ?? null);

        return $this->ok(Presentation::paiement($p), 'Paiement initié : poursuivez sur la page de paiement sécurisée.', 201);
    }

    /** GET /v1/paiements/{uuid} - état à jour (relu chez Paiement si le paiement n'est pas terminé). */
    public function voir(PaiementEnLigne $paiement): JsonResponse
    {
        $estInitiateur = hash_equals((string) $paiement->initie_par_uuid, Contexte::utilisateurUuid());
        if (! $estInitiateur) {
            $this->factures->exigerLecture($paiement->facture()->firstOrFail());
        }

        $enCours = ! in_array($paiement->statut, ['refuse', 'annule', 'expire', 'echec_creation', ...PaiementClient::ETATS_ACQUIS], true);
        if ($enCours && $paiement->encaissement_uuid !== null && ($paiement->derniere_synchro === null || $paiement->derniere_synchro->lt(now()->subSeconds(10)))) {
            $paiement = $this->paiements->synchroniser($paiement);
        }

        return $this->ok(Presentation::paiement($paiement));
    }

    /** GET /v1/factures/{uuid}/paiements - historique des tentatives de paiement en ligne. */
    public function historique(Facture $facture): JsonResponse
    {
        $this->factures->exigerLecture($facture);
        $liste = PaiementEnLigne::where('facture_id', $facture->id)->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get();

        return $this->ok($liste->map(fn ($p) => Presentation::paiement($p))->values());
    }

    private function origineAutorisee(string $url): bool
    {
        $p = parse_url($url);
        if (! isset($p['scheme'], $p['host'])) {
            return false;
        }
        $origine = strtolower($p['scheme'].'://'.$p['host'].(isset($p['port']) ? ':'.$p['port'] : ''));

        return in_array($origine, array_map('strtolower', (array) config('services.front.origines', [])), true);
    }
}
