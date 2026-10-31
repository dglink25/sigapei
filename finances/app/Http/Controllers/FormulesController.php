<?php

namespace App\Http\Controllers;

use App\Exceptions\MetierException;
use App\Integrations\ScolariteClient;
use App\Models\FormuleTarifaire;
use App\Services\Gouvernance;
use App\Services\Tarifs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FormulesController extends Controller
{
    private const NATURES = ['scolarite', 'inscription', 'cantine', 'transport', 'activite', 'dossier', 'autre'];

    public function __construct(
        private readonly Tarifs $tarifs,
        private readonly Gouvernance $gouvernance,
        private readonly ScolariteClient $scolarite,
    ) {}

    /** GET /v1/formules?annee_scolaire=&actives=1 */
    public function index(Request $request): JsonResponse
    {
        if (! $this->gouvernance->peut('gerer_tarifs')) {
            $this->gouvernance->exiger('emettre_factures');
        }
        $d = $request->validate(['annee_scolaire' => ['nullable', 'regex:/^\d{4}-\d{4}$/'], 'actives' => ['nullable', 'boolean']]);

        $formules = FormuleTarifaire::query()
            ->when($d['annee_scolaire'] ?? null, fn ($q, $a) => $q->where('annee_scolaire', $a))
            ->when($request->boolean('actives'), fn ($q) => $q->where('actif', true))
            ->orderByDesc('annee_scolaire')->orderBy('nature')->orderBy('libelle')->limit(500)->get();

        return $this->ok($formules->map(fn ($f) => Presentation::formule($f))->values());
    }

    /** GET /v1/formules/applicables?apprenant_uuid=&annee_scolaire= - formules qui concernent la classe de l'apprenant. */
    public function applicables(Request $request): JsonResponse
    {
        $this->gouvernance->exiger('emettre_factures');
        $d = $request->validate(['apprenant_uuid' => ['required', 'uuid'], 'annee_scolaire' => ['required', 'regex:/^\d{4}-\d{4}$/']]);
        $a = $this->scolarite->apprenant($d['apprenant_uuid']);
        if ($a === null) {
            throw MetierException::introuvable('Apprenant introuvable.');
        }

        return $this->ok($this->tarifs->applicables($d['annee_scolaire'], (array) ($a['classe'] ?? []))->map(fn ($f) => Presentation::formule($f))->values());
    }

    /** POST /v1/formules */
    public function creer(Request $request): JsonResponse
    {
        $this->gouvernance->exiger('gerer_tarifs');
        $d = $request->validate($this->regles(true));
        $this->unicite($d);

        return $this->ok(Presentation::formule($this->tarifs->creer($d)), 'Formule tarifaire créée.', 201);
    }

    /** PATCH /v1/formules-tarifaires/{uuid} */
    public function modifier(Request $request, FormuleTarifaire $formule): JsonResponse
    {
        $this->gouvernance->exiger('gerer_tarifs');
        $d = $request->validate($this->regles(false));
        if (isset($d['code']) && $d['code'] !== $formule->code) {
            throw ValidationException::withMessages(['code' => "Le code d'une formule ne change pas (référence stable)."]);
        }

        return $this->ok(Presentation::formule($this->tarifs->modifier($formule, array_diff_key($d, ['code' => 1]))), 'Formule tarifaire mise à jour.');
    }

    private function regles(bool $creation): array
    {
        $req = $creation ? 'required' : 'sometimes';

        return [
            'code' => [$req, 'regex:/^[a-z][a-z0-9_-]{2,59}$/'],
            'libelle' => [$req, 'string', 'min:3', 'max:150'],
            'nature' => [$req, Rule::in(self::NATURES)],
            'annee_scolaire' => [$req, 'regex:/^(\d{4})-(\d{4})$/'],
            'cycle' => ['nullable', Rule::in(['maternelle', 'primaire', 'secondaire', 'universitaire'])],
            'niveau' => ['nullable', 'string', 'max:60'],
            'classe_uuid' => ['nullable', 'uuid'],
            'montant' => [$req, 'integer', 'min:1', 'max:100000000000'],
            'echeancier' => [$req, 'array', 'min:1', 'max:24'],
            'echeancier.*.libelle' => ['nullable', 'string', 'max:120'],
            'echeancier.*.date_echeance' => ['required', 'date_format:Y-m-d'],
            'echeancier.*.montant' => ['required', 'integer', 'min:1'],
            'actif' => ['sometimes', 'boolean'],
        ];
    }

    private function unicite(array $d): void
    {
        [$debut, $fin] = explode('-', $d['annee_scolaire']);
        if ((int) $fin !== (int) $debut + 1) {
            throw ValidationException::withMessages(['annee_scolaire' => 'Année scolaire attendue au format 2026-2027.']);
        }
        if (FormuleTarifaire::where('annee_scolaire', $d['annee_scolaire'])->where('code', $d['code'])->exists()) {
            throw MetierException::conflit('Une formule de cette année utilise déjà ce code.', 'CODE_DEJA_UTILISE');
        }
    }
}
