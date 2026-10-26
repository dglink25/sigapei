<?php

namespace App\Http\Controllers;

use App\Domain\ConfigurationAcademique\AnneeAcademique;
use App\Domain\ConfigurationAcademique\ClasseConfig;
use App\Domain\ConfigurationAcademique\CohorteUniversitaire;
use App\Domain\ConfigurationAcademique\ConfigurationAcademiqueService;
use App\Domain\ConfigurationAcademique\CycleConfig;
use App\Domain\ConfigurationAcademique\MatiereConfig;
use App\Domain\ConfigurationAcademique\NiveauScolaire;
use App\Domain\ConfigurationAcademique\SerieFiliere;
use App\Domain\ConfigurationAcademique\SubdivisionPedagogique;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Endpoints de configuration académique d'un établissement.
 * Toutes les routes sont sous /v1/interne/mon-etablissement/configuration/*
 * et exigent les middlewares secret.interne + contexte.tenant.
 *
 * Le tenant (établissement connecté) est lu depuis request()->attributes->get('etablissement').
 */
class ConfigurationAcademiqueController extends Controller
{
    public function __construct(
        private ConfigurationAcademiqueService $service,
    ) {}

    // ── Helpers ─────────────────────────────────────────────────────────

    private function etablissementId(): int
    {
        return request()->attributes->get('etablissement')->id;
    }

    private function ok(mixed $data, string $message = 'OK', int $code = 200): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $data, 'message' => $message], $code);
    }

    // ════════════════════════════════════════════════════════════════════
    // Années académiques
    // ════════════════════════════════════════════════════════════════════

    public function listerAnnees(): JsonResponse
    {
        $annees = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->orderByDesc('date_debut')
            ->withCount('cyclesConfig as nb_cycles')
            ->get()
            ->map(fn($a) => array_merge($a->toArray(), ['statut' => $a->statut]));

        return $this->ok($annees);
    }

    public function creerAnnee(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'date_debut' => ['required', 'date'],
            'date_fin'   => ['required', 'date', 'after:date_debut'],
            'libelle'    => ['nullable', 'string', 'max:20'],
        ]);

        $annee = $this->service->creerAnnee($this->etablissementId(), $donnees);

        return $this->ok(array_merge($annee->toArray(), ['statut' => $annee->statut]), 'Année créée.', 201);
    }

    public function afficherAnnee(string $uuid): JsonResponse
    {
        $annee = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)
            ->firstOrFail();

        return $this->ok(array_merge($annee->toArray(), ['statut' => $annee->statut]));
    }

    public function modifierAnnee(Request $request, string $uuid): JsonResponse
    {
        $annee = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)
            ->firstOrFail();

        $donnees = $request->validate([
            'date_debut'     => ['sometimes', 'date'],
            'date_fin'       => ['sometimes', 'date'],
            'libelle'        => ['sometimes', 'string', 'max:20'],
            'note_suspension'=> ['sometimes', 'string'],
        ]);

        $annee = $this->service->modifierAnnee($annee, $donnees);

        return $this->ok(array_merge($annee->toArray(), ['statut' => $annee->statut]));
    }

    public function suspendreAnnee(Request $request, string $uuid): JsonResponse
    {
        $annee = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)
            ->firstOrFail();

        $note = $request->input('note', '');
        $annee = $this->service->suspendreAnnee($annee, $note);

        return $this->ok(array_merge($annee->toArray(), ['statut' => $annee->statut]));
    }

    public function reactiverAnnee(string $uuid): JsonResponse
    {
        $annee = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)
            ->firstOrFail();

        $annee = $this->service->reactiverAnnee($annee);

        return $this->ok(array_merge($annee->toArray(), ['statut' => $annee->statut]));
    }

    // ════════════════════════════════════════════════════════════════════
    // Cycles actifs
    // ════════════════════════════════════════════════════════════════════

    public function listerCycles(Request $request): JsonResponse
    {
        $q = CycleConfig::where('etablissement_id', $this->etablissementId())
            ->with('annee:id,uuid,libelle');

        if ($request->filled('annee_uuid')) {
            $q->whereHas('annee', fn($s) => $s->where('uuid', $request->annee_uuid));
        }

        return $this->ok($q->get());
    }

    public function creerOuMettreAJourCycle(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'annee_uuid' => ['required', 'uuid'],
            'cycle'      => ['required', Rule::in(CycleConfig::CYCLES)],
            'actif'      => ['sometimes', 'boolean'],
        ]);

        $annee = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $donnees['annee_uuid'])
            ->firstOrFail();

        $cycle = CycleConfig::updateOrCreate(
            ['etablissement_id' => $this->etablissementId(), 'annee_id' => $annee->id, 'cycle' => $donnees['cycle']],
            ['actif' => $donnees['actif'] ?? true],
        );

        return $this->ok($cycle);
    }

    // ════════════════════════════════════════════════════════════════════
    // Subdivisions
    // ════════════════════════════════════════════════════════════════════

    public function listerSubdivisions(Request $request): JsonResponse
    {
        $q = SubdivisionPedagogique::where('etablissement_id', $this->etablissementId())
            ->with(['cycleConfig:id,uuid,cycle', 'annee:id,uuid,libelle']);

        if ($request->filled('annee_uuid')) {
            $q->whereHas('annee', fn($s) => $s->where('uuid', $request->annee_uuid));
        }
        if ($request->filled('cycle_uuid')) {
            $q->whereHas('cycleConfig', fn($s) => $s->where('uuid', $request->cycle_uuid));
        }

        return $this->ok($q->get());
    }
    public function creerSubdivision(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'annee_uuid'       => ['required', 'uuid'],
            'cycle_config_uuid'=> ['required', 'uuid'],
            'type'             => ['required', Rule::in(SubdivisionPedagogique::TYPES)],
            'nom'              => ['required', 'string', 'max:100'],
            'code'             => ['nullable', 'string', 'max:20'],
            'description'      => ['nullable', 'string'],
        ]);

        $annee = AnneeAcademique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $donnees['annee_uuid'])->firstOrFail();
        $cycle = CycleConfig::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $donnees['cycle_config_uuid'])->firstOrFail();

        $sub = SubdivisionPedagogique::create([
            'etablissement_id' => $this->etablissementId(),
            'annee_id'         => $annee->id,
            'cycle_config_id'  => $cycle->id,
            'type'             => $donnees['type'],
            'nom'              => $donnees['nom'],
            'code'             => $donnees['code'] ?? '',
            'description'      => $donnees['description'] ?? '',
        ]);

        return $this->ok($sub, 'Subdivision créée.', 201);
    }

    public function modifierSubdivision(Request $request, string $uuid): JsonResponse
    {
        $sub = SubdivisionPedagogique::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $donnees = $request->validate([
            'nom'        => ['sometimes', 'string', 'max:100'],
            'code'       => ['sometimes', 'string', 'max:20'],
            'description'=> ['sometimes', 'string'],
            'actif'      => ['sometimes', 'boolean'],
        ]);

        $sub->update($donnees);
        return $this->ok($sub->fresh());
    }

    // ════════════════════════════════════════════════════════════════════
    // Niveaux scolaires
    // ════════════════════════════════════════════════════════════════════

    public function listerNiveaux(Request $request): JsonResponse
    {
        $q = NiveauScolaire::where('etablissement_id', $this->etablissementId())
            ->orderBy('cycle')->orderBy('ordre');

        if ($request->filled('cycle')) {
            $q->where('cycle', $request->cycle);
        }

        return $this->ok($q->get());
    }

    public function creerNiveau(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'cycle'      => ['required', Rule::in(CycleConfig::CYCLES)],
            'nom'        => ['required', 'string', 'max:100'],
            'abreviation'=> ['nullable', 'string', 'max:20'],
            'ordre'      => ['nullable', 'integer', 'min:0'],
        ]);

        $niveau = NiveauScolaire::create(array_merge($donnees, [
            'etablissement_id' => $this->etablissementId(),
        ]));

        return $this->ok($niveau, 'Niveau créé.', 201);
    }

    public function modifierNiveau(Request $request, string $uuid): JsonResponse
    {
        $niveau = NiveauScolaire::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $donnees = $request->validate([
            'nom'        => ['sometimes', 'string', 'max:100'],
            'abreviation'=> ['sometimes', 'string', 'max:20'],
            'ordre'      => ['sometimes', 'integer', 'min:0'],
            'actif'      => ['sometimes', 'boolean'],
        ]);

        $niveau->update($donnees);
        return $this->ok($niveau->fresh());
    }

    // ════════════════════════════════════════════════════════════════════
    // Séries / Filières
    // ════════════════════════════════════════════════════════════════════

    public function listerSeries(Request $request): JsonResponse
    {
        $q = SerieFiliere::where('etablissement_id', $this->etablissementId())
            ->with('subdivision:id,uuid,nom');

        if ($request->filled('cycle')) {
            $q->where('cycle', $request->cycle);
        }

        return $this->ok($q->orderBy('cycle')->orderBy('nom')->get());
    }

    public function creerSerie(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'cycle'           => ['required', Rule::in(CycleConfig::CYCLES)],
            'nom'             => ['required', 'string', 'max:100'],
            'code'            => ['nullable', 'string', 'max:20'],
            'description'     => ['nullable', 'string'],
            'subdivision_uuid' => ['nullable', 'uuid'],
        ]);

        $subId = null;
        if (!empty($donnees['subdivision_uuid'])) {
            $sub   = SubdivisionPedagogique::where('etablissement_id', $this->etablissementId())
                ->where('uuid', $donnees['subdivision_uuid'])->firstOrFail();
            $subId = $sub->id;
        }

        $serie = SerieFiliere::create([
            'etablissement_id' => $this->etablissementId(),
            'cycle'            => $donnees['cycle'],
            'nom'              => $donnees['nom'],
            'code'             => $donnees['code'] ?? '',
            'description'      => $donnees['description'] ?? '',
            'subdivision_id'   => $subId,
        ]);

        return $this->ok($serie->load('subdivision:id,uuid,nom'), 'Série / filière créée.', 201);
    }

    public function modifierSerie(Request $request, string $uuid): JsonResponse
    {
        $serie = SerieFiliere::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $donnees = $request->validate([
            'nom'        => ['sometimes', 'string', 'max:100'],
            'code'       => ['sometimes', 'string', 'max:20'],
            'description'=> ['sometimes', 'string'],
            'actif'      => ['sometimes', 'boolean'],
        ]);

        $serie->update($donnees);
        return $this->ok($serie->fresh()->load('subdivision:id,uuid,nom'));
    }

    // ════════════════════════════════════════════════════════════════════
    // Classes concrètes
    // ════════════════════════════════════════════════════════════════════

    public function listerClasses(Request $request): JsonResponse
    {
        $q = ClasseConfig::where('etablissement_id', $this->etablissementId())
            ->with(['niveau:id,uuid,nom,abreviation,cycle', 'subdivision:id,uuid,nom,code', 'serie:id,uuid,nom,code', 'annee:id,uuid,libelle']);

        if ($request->filled('annee_uuid')) {
            $q->whereHas('annee', fn($s) => $s->where('uuid', $request->annee_uuid));
        }
        if ($request->filled('cycle')) {
            $q->whereHas('niveau', fn($s) => $s->where('cycle', $request->cycle));
        }

        return $this->ok($q->orderBy('id')->get());
    }

    public function creerClasse(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'annee_uuid'       => ['required', 'uuid'],
            'niveau_uuid'      => ['required', 'uuid'],
            'subdivision_uuid' => ['required', 'uuid'],
            'serie_uuid'       => ['nullable', 'uuid'],
            'sigle'            => ['nullable', 'string', 'max:50'],
            'effectif_previsionnel' => ['nullable', 'integer', 'min:1'],
        ]);

        $etabId = $this->etablissementId();
        $annee  = AnneeAcademique::where('etablissement_id', $etabId)->where('uuid', $donnees['annee_uuid'])->firstOrFail();
        $niveau = NiveauScolaire::where('etablissement_id', $etabId)->where('uuid', $donnees['niveau_uuid'])->firstOrFail();
        $sub    = SubdivisionPedagogique::where('etablissement_id', $etabId)->where('uuid', $donnees['subdivision_uuid'])->firstOrFail();

        $serieId = null;
        if (!empty($donnees['serie_uuid'])) {
            $serieId = SerieFiliere::where('etablissement_id', $etabId)->where('uuid', $donnees['serie_uuid'])->firstOrFail()->id;
        }

        $classe = ClasseConfig::create([
            'etablissement_id'      => $etabId,
            'annee_id'              => $annee->id,
            'niveau_id'             => $niveau->id,
            'subdivision_id'        => $sub->id,
            'serie_id'              => $serieId,
            'sigle'                 => $donnees['sigle'] ?? '',
            'effectif_previsionnel' => $donnees['effectif_previsionnel'] ?? null,
        ]);

        return $this->ok($classe->load(['niveau:id,uuid,nom,abreviation', 'subdivision:id,uuid,nom,code', 'serie:id,uuid,nom,code']), 'Classe créée.', 201);
    }

    public function modifierClasse(Request $request, string $uuid): JsonResponse
    {
        $classe = ClasseConfig::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $donnees = $request->validate([
            'sigle'                 => ['sometimes', 'string', 'max:50'],
            'effectif_previsionnel' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'actif'                 => ['sometimes', 'boolean'],
        ]);

        $classe->update($donnees);
        return $this->ok($classe->fresh()->load(['niveau:id,uuid,nom,abreviation', 'subdivision:id,uuid,nom,code', 'serie:id,uuid,nom,code']));
    }

    // ════════════════════════════════════════════════════════════════════
    // Cohortes universitaires
    // ════════════════════════════════════════════════════════════════════

    public function listerCohortes(Request $request): JsonResponse
    {
        $q = CohorteUniversitaire::where('etablissement_id', $this->etablissementId())
            ->with(['filiere:id,uuid,nom,code', 'niveau:id,uuid,nom,abreviation', 'annee:id,uuid,libelle']);

        if ($request->filled('annee_uuid')) {
            $q->whereHas('annee', fn($s) => $s->where('uuid', $request->annee_uuid));
        }

        return $this->ok($q->get());
    }

    public function creerCohorte(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'annee_uuid'   => ['required', 'uuid'],
            'filiere_uuid' => ['required', 'uuid'],
            'niveau_uuid'  => ['required', 'uuid'],
            'diplome'      => ['required', Rule::in(CohorteUniversitaire::DIPLOMES)],
            'lettre'       => ['nullable', 'string', 'max:5'],
            'sigle'        => ['nullable', 'string', 'max:30'],
            'semestres'    => ['nullable', 'string', 'max:50'],
        ]);

        $etabId  = $this->etablissementId();
        $annee   = AnneeAcademique::where('etablissement_id', $etabId)->where('uuid', $donnees['annee_uuid'])->firstOrFail();
        $filiere = SerieFiliere::where('etablissement_id', $etabId)->where('uuid', $donnees['filiere_uuid'])->firstOrFail();
        $niveau  = NiveauScolaire::where('etablissement_id', $etabId)->where('uuid', $donnees['niveau_uuid'])->firstOrFail();

        $cohorte = CohorteUniversitaire::create([
            'etablissement_id' => $etabId,
            'annee_id'         => $annee->id,
            'filiere_id'       => $filiere->id,
            'niveau_id'        => $niveau->id,
            'diplome'          => $donnees['diplome'],
            'lettre'           => $donnees['lettre'] ?? '',
            'sigle'            => $donnees['sigle'] ?? '',
            'semestres'        => $donnees['semestres'] ?? '',
        ]);

        return $this->ok($cohorte->load(['filiere:id,uuid,nom,code', 'niveau:id,uuid,nom,abreviation']), 'Cohorte créée.', 201);
    }

    // ════════════════════════════════════════════════════════════════════
    // Matières avec coefficient
    // ════════════════════════════════════════════════════════════════════

    public function listerMatieres(Request $request): JsonResponse
    {
        $q = MatiereConfig::where('etablissement_id', $this->etablissementId())
            ->with(['niveau:id,uuid,nom,abreviation', 'serie:id,uuid,nom,code', 'annee:id,uuid,libelle']);

        if ($request->filled('annee_uuid')) {
            $q->whereHas('annee', fn($s) => $s->where('uuid', $request->annee_uuid));
        }
        if ($request->filled('niveau_uuid')) {
            $q->whereHas('niveau', fn($s) => $s->where('uuid', $request->niveau_uuid));
        }
        if ($request->filled('cycle')) {
            $q->where('cycle', $request->cycle);
        }

        return $this->ok($q->orderBy('cycle')->orderBy('nom_matiere')->get());
    }

    public function creerMatiere(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'annee_uuid'          => ['required', 'uuid'],
            'cycle'               => ['required', Rule::in(CycleConfig::CYCLES)],
            'niveau_uuid'         => ['required', 'uuid'],
            'serie_uuid'          => ['nullable', 'uuid'],
            'matiere_uuid_externe'=> ['required', 'uuid'],
            'nom_matiere'         => ['required', 'string', 'max:255'],
            'code_matiere'        => ['nullable', 'string', 'max:30'],
            'coefficient'         => ['nullable', 'numeric', 'min:0'],
            'est_obligatoire'     => ['sometimes', 'boolean'],
        ]);

        $etabId = $this->etablissementId();
        $annee  = AnneeAcademique::where('etablissement_id', $etabId)->where('uuid', $donnees['annee_uuid'])->firstOrFail();
        $niveau = NiveauScolaire::where('etablissement_id', $etabId)->where('uuid', $donnees['niveau_uuid'])->firstOrFail();

        $serieId = null;
        if (!empty($donnees['serie_uuid'])) {
            $serieId = SerieFiliere::where('etablissement_id', $etabId)->where('uuid', $donnees['serie_uuid'])->firstOrFail()->id;
        }

        $matiere = MatiereConfig::create([
            'etablissement_id'    => $etabId,
            'annee_id'            => $annee->id,
            'cycle'               => $donnees['cycle'],
            'niveau_id'           => $niveau->id,
            'serie_id'            => $serieId,
            'matiere_uuid_externe'=> $donnees['matiere_uuid_externe'],
            'nom_matiere'         => $donnees['nom_matiere'],
            'code_matiere'        => $donnees['code_matiere'] ?? '',
            'coefficient'         => $donnees['coefficient'] ?? null,
            'est_obligatoire'     => $donnees['est_obligatoire'] ?? true,
        ]);

        return $this->ok($matiere->load(['niveau:id,uuid,nom,abreviation', 'serie:id,uuid,nom,code']), 'Matière configurée.', 201);
    }

    public function modifierMatiere(Request $request, string $uuid): JsonResponse
    {
        $matiere = MatiereConfig::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $donnees = $request->validate([
            'nom_matiere'    => ['sometimes', 'string', 'max:255'],
            'code_matiere'   => ['sometimes', 'string', 'max:30'],
            'coefficient'    => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'est_obligatoire'=> ['sometimes', 'boolean'],
            'actif'          => ['sometimes', 'boolean'],
        ]);

        $matiere->update($donnees);
        return $this->ok($matiere->fresh()->load(['niveau:id,uuid,nom,abreviation', 'serie:id,uuid,nom,code']));
    }

    public function previewPropagation(string $uuid): JsonResponse
    {
        $matiere = MatiereConfig::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $classes = $this->service->classesPourPropagation($matiere);

        return $this->ok([
            'classes' => $classes->map(fn($c) => [
                'uuid'  => $c->uuid,
                'sigle' => $c->sigle,
                'niveau'=> $c->niveau->nom,
                'subdivision' => $c->subdivision->nom,
            ]),
            'count'   => $classes->count(),
        ]);
    }

    public function propagerMatiere(string $uuid): JsonResponse
    {
        $matiere = MatiereConfig::where('etablissement_id', $this->etablissementId())
            ->where('uuid', $uuid)->firstOrFail();

        $crees = $this->service->propagerMatiere($matiere);

        return $this->ok(['crees' => $crees], "{$crees} configuration(s) créée(s) par propagation.");
    }
}
