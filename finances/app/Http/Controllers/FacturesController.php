<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\ScolariteClient;
use App\Models\Facture;
use App\Services\Facturation;
use App\Services\Gouvernance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

class FacturesController extends Controller
{
    private const NATURES = ['scolarite', 'inscription', 'cantine', 'transport', 'activite', 'dossier', 'autre'];

    public function __construct(
        private readonly Facturation $facturation,
        private readonly Gouvernance $gouvernance,
        private readonly ScolariteClient $scolarite,
    ) {}

    /** GET /v1/factures - gestion : filtres statut, apprenant, classe, année, recherche (numéro, nom), en_retard ; tri. */
    public function index(Request $request): JsonResponse
    {
        $this->gouvernance->exiger('consulter_finances');
        $d = $request->validate([
            'statut' => ['nullable', Rule::in(['emise', 'partiellement_reglee', 'reglee', 'annulee', 'ouvertes'])],
            'apprenant_uuid' => ['nullable', 'uuid'],
            'classe_uuid' => ['nullable', 'uuid'],
            'annee_scolaire' => ['nullable', 'regex:/^\d{4}-\d{4}$/'],
            'recherche' => ['nullable', 'string', 'max:80'],
            'en_retard' => ['nullable', 'boolean'],
            'tri' => ['nullable', Rule::in(['recentes', 'anciennes', 'reste_desc', 'nom'])],
        ]);

        $q = Facture::query()
            ->when($d['statut'] ?? null, fn ($q, $s) => $s === 'ouvertes' ? $q->whereIn('statut', ['emise', 'partiellement_reglee']) : $q->where('statut', $s))
            ->when($d['apprenant_uuid'] ?? null, fn ($q, $v) => $q->where('apprenant_uuid', $v))
            ->when($d['classe_uuid'] ?? null, fn ($q, $v) => $q->where('classe_uuid', $v))
            ->when($d['annee_scolaire'] ?? null, fn ($q, $v) => $q->where('annee_scolaire', $v))
            ->when($d['recherche'] ?? null, function ($q, $v) {
                $motif = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $v).'%';
                $q->where(fn ($t) => $t->where('numero', 'ilike', $motif)->orWhere('apprenant_nom', 'ilike', $motif)->orWhere('apprenant_matricule', 'ilike', $motif));
            })
            ->when($request->boolean('en_retard'), fn ($q) => $q->whereIn('statut', ['emise', 'partiellement_reglee'])
                ->whereRaw('(SELECT COALESCE(SUM(e.montant), 0) FROM finances.echeances e WHERE e.facture_id = factures.id AND e.date_echeance <= CURRENT_DATE) > factures.montant_regle'));

        match ($d['tri'] ?? 'recentes') {
            'anciennes' => $q->orderBy('created_at')->orderBy('id'),
            'reste_desc' => $q->orderByRaw('(montant_total - montant_regle) DESC')->orderBy('id'),
            'nom' => $q->orderBy('apprenant_nom')->orderBy('id'),
            default => $q->orderByDesc('created_at')->orderByDesc('id'),
        };

        return $this->page($q->paginate($this->parPage($request)), fn ($f) => Presentation::facture($f));
    }

    /** GET /v1/factures/{uuid} - gestionnaire, ou l'apprenant / ses parents. */
    public function voir(Facture $facture): JsonResponse
    {
        $this->exigerLecture($facture);

        return $this->ok(Presentation::facture($facture->load(['lignes', 'echeances', 'reglements']), true));
    }

    /** POST /v1/factures */
    public function emettre(Request $request): JsonResponse
    {
        $this->gouvernance->exiger('emettre_factures');
        $d = $request->validate([
            'apprenant_uuid' => ['required', 'uuid'],
            'annee_scolaire' => ['required', 'regex:/^\d{4}-\d{4}$/'],
            'libelle' => ['nullable', 'string', 'max:200'],
            'formules' => ['nullable', 'array', 'max:20'],
            'formules.*' => ['uuid', 'distinct'],
            'lignes' => ['nullable', 'array', 'max:20'],
            'lignes.*.libelle' => ['required', 'string', 'min:3', 'max:200'],
            'lignes.*.nature' => ['required', Rule::in(self::NATURES)],
            'lignes.*.montant' => ['required', 'integer', 'min:1', 'max:100000000000'],
            'lignes.*.date_echeance' => ['required', 'date_format:Y-m-d'],
        ]);

        $f = $this->facturation->emettre($d);

        return $this->ok(Presentation::facture($f->load('reglements'), true), "Facture {$f->numero} émise.", 201);
    }

    /** POST /v1/factures/classe - une facture par apprenant actif de la classe (relançable sans doublon). */
    public function emettrePourClasse(Request $request): JsonResponse
    {
        $this->gouvernance->exiger('emettre_factures');
        $d = $request->validate([
            'classe_uuid' => ['required', 'uuid'],
            'annee_scolaire' => ['required', 'regex:/^\d{4}-\d{4}$/'],
            'libelle' => ['nullable', 'string', 'max:200'],
            'formules' => ['required', 'array', 'min:1', 'max:20'],
            'formules.*' => ['uuid', 'distinct'],
        ]);

        $r = $this->facturation->emettrePourClasse($d['classe_uuid'], $d['annee_scolaire'], $d['formules'], $d['libelle'] ?? null);
        $n = count($r['creees']);

        return $this->ok([
            'creees' => array_map(fn ($f) => Presentation::facture($f), $r['creees']),
            'ignorees' => $r['ignorees'],
        ], $n > 0 ? "{$n} facture(s) émise(s)." : 'Aucune nouvelle facture : la classe est déjà facturée pour ces formules.', $n > 0 ? 201 : 200);
    }

    /** POST /v1/factures/{uuid}/annuler */
    public function annuler(Request $request, Facture $facture): JsonResponse
    {
        $this->gouvernance->exiger('annuler_facture');
        $d = $request->validate(['motif' => ['required', 'string', 'min:10', 'max:1000']]);

        return $this->ok(Presentation::facture($this->facturation->annuler($facture, trim($d['motif']))), 'Facture annulée.');
    }

    /** GET /v1/factures/{uuid}/pdf - lien relatif signé, valable 5 minutes. */
    public function pdf(Facture $facture): JsonResponse
    {
        $this->exigerLecture($facture);
        $expire = now()->addMinutes(5);

        return $this->ok([
            'url' => URL::temporarySignedRoute('documents.facture', $expire, ['facture' => $facture->uuid, 'e' => Contexte::etablissement()], absolute: false),
            'expire_le' => $expire->toIso8601String(),
        ]);
    }

    /** Gestionnaire (consulter_finances) ou famille rattachée à l'apprenant (Scolarité). */
    public function exigerLecture(Facture $facture): void
    {
        if ($this->gouvernance->peut('consulter_finances')) {
            return;
        }
        if (in_array(Contexte::role(), ['apprenant', 'parent'], true)) {
            $a = $this->scolarite->apprenant($facture->apprenant_uuid);
            if ($a !== null && $this->scolarite->lien($a, Contexte::utilisateurUuid()) !== null) {
                return;
            }
        }

        throw MetierException::introuvable('Facture introuvable.');
    }
}
