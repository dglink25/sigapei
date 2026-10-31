<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Models\Facture;
use App\Models\Reglement;
use App\Services\Gouvernance;
use App\Services\Reglements;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

class ReglementsController extends Controller
{
    public function __construct(
        private readonly Reglements $reglements,
        private readonly Gouvernance $gouvernance,
        private readonly FacturesController $factures,
    ) {}

    /** GET /v1/reglements - filtres statut, mode, période, recherche ; « a_valider » = file de validation. */
    public function index(Request $request): JsonResponse
    {
        if (! $this->gouvernance->peut('consulter_finances') && ! $this->gouvernance->peut('valider_reglement')) {
            $this->gouvernance->exiger('consulter_finances');
        }
        $d = $request->validate([
            'statut' => ['nullable', Rule::in(['a_valider', 'valide', 'rejete'])],
            'mode' => ['nullable', Rule::in(['en_ligne', 'especes', 'virement', 'cheque'])],
            'du' => ['nullable', 'date_format:Y-m-d'],
            'au' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:du'],
            'recherche' => ['nullable', 'string', 'max:80'],
            'tri' => ['nullable', Rule::in(['recents', 'anciens', 'montant_desc'])],
        ]);

        $q = Reglement::query()->with('facture')
            ->when($d['statut'] ?? null, fn ($q, $v) => $q->where('statut', $v))
            ->when($d['mode'] ?? null, fn ($q, $v) => $q->where('mode', $v))
            ->when($d['du'] ?? null, fn ($q, $v) => $q->where('date_reglement', '>=', $v))
            ->when($d['au'] ?? null, fn ($q, $v) => $q->where('date_reglement', '<=', $v))
            ->when($d['recherche'] ?? null, function ($q, $v) {
                $motif = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v).'%';
                $q->where(fn ($t) => $t->where('numero_recu', 'ilike', $motif)->orWhere('piece_reference', 'ilike', $motif)
                    ->orWhereHas('facture', fn ($f) => $f->where('numero', 'ilike', $motif)->orWhere('apprenant_nom', 'ilike', $motif)));
            });

        match ($d['tri'] ?? 'recents') {
            'anciens' => $q->orderBy('created_at')->orderBy('id'),
            'montant_desc' => $q->orderByDesc('montant')->orderBy('id'),
            default => $q->orderByDesc('created_at')->orderByDesc('id'),
        };

        return $this->page($q->paginate($this->parPage($request)), fn ($r) => Presentation::reglement($r));
    }

    /** POST /v1/factures/{uuid}/reglements - espèces, virement ou chèque, pièce justificative obligatoire. */
    public function saisir(Request $request, Facture $facture): JsonResponse
    {
        $this->gouvernance->exiger('saisir_reglement');
        $d = $request->validate([
            'mode' => ['required', Rule::in(['especes', 'virement', 'cheque'])],
            'montant' => ['required', 'integer', 'min:1', 'max:100000000000'],
            'date_reglement' => ['required', 'date_format:Y-m-d'],
            'piece_reference' => ['required', 'string', 'min:2', 'max:100'],
            'commentaire' => ['nullable', 'string', 'max:500'],
        ]);

        $r = $this->reglements->saisir($facture, $d);

        return $this->ok(Presentation::reglement($r), $r->statut === 'valide'
            ? "Règlement enregistré, reçu {$r->numero_recu} disponible."
            : 'Règlement enregistré : il sera définitif après validation par un autre profil habilité.', 201);
    }

    /** POST /v1/reglements/{uuid}/valider */
    public function valider(Reglement $reglement): JsonResponse
    {
        $this->gouvernance->exiger('valider_reglement');
        $r = $this->reglements->valider($reglement);

        return $this->ok(Presentation::reglement($r), "Règlement validé, reçu {$r->numero_recu} disponible.");
    }

    /** POST /v1/reglements/{uuid}/rejeter */
    public function rejeter(Request $request, Reglement $reglement): JsonResponse
    {
        $this->gouvernance->exiger('valider_reglement');
        $d = $request->validate(['motif' => ['required', 'string', 'min:10', 'max:1000']]);

        return $this->ok(Presentation::reglement($this->reglements->rejeter($reglement, trim($d['motif']))), 'Règlement rejeté.');
    }

    /** GET /v1/reglements/{uuid}/recu - lien relatif signé (5 minutes) vers le reçu PDF. */
    public function recu(Reglement $reglement): JsonResponse
    {
        $this->factures->exigerLecture($reglement->facture()->firstOrFail());
        if ($reglement->statut !== 'valide' || $reglement->montant <= 0) {
            throw MetierException::conflit("Le reçu n'est disponible qu'une fois le règlement validé.", 'RECU_INDISPONIBLE');
        }
        $expire = now()->addMinutes(5);

        return $this->ok([
            'url' => URL::temporarySignedRoute('documents.recu', $expire, ['reglement' => $reglement->uuid, 'e' => Contexte::etablissement()], absolute: false),
            'expire_le' => $expire->toIso8601String(),
        ]);
    }
}
