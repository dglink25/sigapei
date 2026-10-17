<?php

namespace Tests\Feature;

use Database\Seeders\GrilleEvaluationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Base des tests d'API : vraie base PostgreSQL (contraintes et triggers compris),
 * Scolarité simulée au niveau HTTP (contrat d'interface demandé : uuids exposés).
 */
abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected const TENANT = 1;

    protected string $admin;

    protected string $prof;

    protected string $autreProf;

    protected string $classe;

    protected string $parent;

    protected string $eleveUser;

    /** @var array<string, array<string, mixed>> apprenants simulés côté Scolarité */
    protected array $apprenants = [];

    /** @var list<array<string, mixed>> créneaux d'emploi du temps simulés */
    protected array $creneaux = [];

    protected bool $contratComplet = true;

    protected function beforeRefreshingDatabase()
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS evaluations');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(GrilleEvaluationSeeder::class);

        $this->admin = (string) Str::uuid();
        $this->prof = (string) Str::uuid();
        $this->autreProf = (string) Str::uuid();
        $this->classe = (string) Str::uuid();
        $this->parent = (string) Str::uuid();
        $this->eleveUser = (string) Str::uuid();

        $this->simulerScolarite();
    }

    protected function ajouterApprenant(?string $uuid = null, ?string $classe = null, array $champs = []): string
    {
        $uuid ??= (string) Str::uuid();
        $this->apprenants[$uuid] = array_merge([
            'uuid' => $uuid,
            'nom' => 'NOM'.count($this->apprenants),
            'prenom' => 'Prenom',
            'matricule' => 'M'.count($this->apprenants),
            'statut' => 'actif',
            'utilisateur_uuid' => null,
            'classe' => ['uuid' => $classe ?? $this->classe, 'nom' => '3e A', 'cycle' => 'secondaire', 'niveau' => '3e', 'programme' => 'beninois'],
            'parents' => [],
        ], $champs);

        return $uuid;
    }

    protected function affecter(string $enseignant, string $matiereUuid, ?string $classe = null): void
    {
        $this->creneaux[] = [
            'uuid' => (string) Str::uuid(),
            'classe_uuid' => $classe ?? $this->classe,
            'enseignant_uuid' => $enseignant,
            'matiere_uuid' => $matiereUuid,
            'statut' => 'actif',
        ];
    }

    private function simulerScolarite(): void
    {
        Http::preventStrayRequests();
        Http::fake(function (Request $r) {
            if (($r->header('X-Internal-Secret')[0] ?? null) !== 'secret-de-test-interne-0123456789abcdef') {
                return Http::response(['succes' => false], 403);
            }
            $tenant = (int) ($r->header('X-Tenant-Id')[0] ?? 0);
            parse_str((string) parse_url($r->url(), PHP_URL_QUERY), $q);

            if (str_contains($r->url(), '/v1/interne/apprenants')) {
                $liste = $tenant === self::TENANT ? $this->apprenants : [];
                $liste = array_map(fn ($a) => $this->contratComplet ? $a : array_diff_key($a, ['utilisateur_uuid' => 1]), $liste);
                if (isset($q['uuid'])) {
                    return Http::response(['succes' => true, 'donnees' => $liste[$q['uuid']] ?? null]);
                }

                return Http::response(['succes' => true, 'donnees' => array_values(array_filter(
                    $liste,
                    fn ($a) => $a['classe']['uuid'] === ($q['classe_uuid'] ?? null) && $a['statut'] === ($q['statut'] ?? 'actif')
                ))]);
            }

            if (str_contains($r->url(), '/v1/interne/affectations/verifier')) {
                if (! $this->contratComplet) {
                    return Http::response(['succes' => true, 'donnees' => null, 'data' => ['incomplet' => true]], 200);
                }

                $enseignant = $q['enseignant_uuid'] ?? null;
                $matiere = $q['matiere_uuid'] ?? null;
                $classe = $q['classe_uuid'] ?? null;
                $affecte = false;
                if ($tenant === self::TENANT) {
                    foreach ($this->creneaux as $c) {
                        if ($c['classe_uuid'] === $classe
                            && $c['enseignant_uuid'] === $enseignant
                            && $c['matiere_uuid'] === $matiere
                            && ($c['statut'] ?? 'actif') === 'actif') {
                            $affecte = true;
                            break;
                        }
                    }
                }

                return Http::response(['succes' => true, 'data' => [
                    'enseignant_uuid' => $enseignant,
                    'matiere_uuid' => $matiere,
                    'classe_uuid' => $classe,
                    'affecte' => $affecte,
                ]]);
            }

            if (str_contains($r->url(), '/v1/interne/affectations')) {
                if (! $this->contratComplet) {
                    return Http::response(['succes' => true, 'donnees' => null, 'data' => ['incomplet' => true]], 200);
                }

                $liste = $tenant === self::TENANT ? $this->creneaux : [];
                $liste = array_values(array_filter($liste, fn ($c) => $c['classe_uuid'] === ($q['classe_uuid'] ?? null)
                    && $c['enseignant_uuid'] === ($q['enseignant_uuid'] ?? null)
                    && (! isset($q['matiere_uuid']) || $c['matiere_uuid'] === $q['matiere_uuid'])));

                return Http::response(['succes' => true, 'data' => array_map(fn ($c) => [
                    'uuid' => $c['uuid'],
                    'enseignant_uuid' => $c['enseignant_uuid'],
                    'matiere_uuid' => $c['matiere_uuid'],
                    'classe_uuid' => $c['classe_uuid'],
                    'annee_scolaire' => '2026-2027',
                    'statut' => $c['statut'] ?? 'actif',
                ], $liste)]);
            }

            if (str_contains($r->url(), '/v1/interne/emplois-du-temps')) {
                $creneaux = $tenant === self::TENANT ? $this->creneaux : [];
                $creneaux = array_values(array_filter($creneaux, fn ($c) => $c['classe_uuid'] === ($q['classe_uuid'] ?? null)
                    && $c['enseignant_uuid'] === ($q['enseignant_uuid'] ?? null)));
                if (! $this->contratComplet) {
                    $creneaux = array_map(fn ($c) => array_diff_key($c, ['enseignant_uuid' => 1, 'matiere_uuid' => 1]) + ['enseignant_id' => 7, 'matiere_id' => 3], $creneaux ?: [['classe_uuid' => $q['classe_uuid'] ?? null]]);
                }

                return Http::response(['succes' => true, 'donnees' => $creneaux]);
            }

            return Http::response([], 404);
        });
    }

    /** En-têtes posés par la Gateway. */
    protected function en(string $role, string $utilisateur, int $tenant = self::TENANT, ?string $secret = 'secret-de-test-interne-0123456789abcdef'): static
    {
        $this->flushHeaders();
        $this->withHeaders(array_filter([
            'X-Internal-Secret' => $secret,
            'X-Tenant-Id' => (string) $tenant,
            'X-User-Id' => $utilisateur,
            'X-User-Role' => $role,
        ], fn ($v) => $v !== null));

        return $this;
    }

    protected function commeAdmin(int $tenant = self::TENANT): static
    {
        return $this->en('administrateur', $this->admin, $tenant);
    }

    protected function commeProf(?string $prof = null): static
    {
        return $this->en('enseignant', $prof ?? $this->prof);
    }

    /** Établissement prêt : règles de notation du secondaire, une période ouverte, une matière. */
    protected function configurer(array $regles = []): array
    {
        $grille = $this->commeAdmin()->getJson('/v1/grilles?cycle=secondaire')->assertOk()->json('data.0.uuid');

        $this->commeAdmin()->putJson('/v1/parametres-notation/secondaire', array_merge([
            'grille_uuid' => $grille,
            'echelle_appreciation' => [
                ['min' => '0', 'max' => '10', 'mention' => 'Insuffisant'],
                ['min' => '10', 'max' => '14', 'mention' => 'Passable'],
                ['min' => '14', 'max' => '20', 'mention' => 'Bien'],
            ],
        ], $regles))->assertOk();

        $periode = $this->commeAdmin()->postJson('/v1/periodes', [
            'annee_scolaire' => '2026-2027', 'cycle' => 'secondaire', 'type' => 'trimestre', 'numero' => 1,
            'libelle' => '1er trimestre', 'date_debut' => '2026-10-01', 'date_fin' => '2026-12-20',
        ])->assertCreated()->json('data.uuid');

        $maths = $this->commeAdmin()->postJson('/v1/matieres', ['code' => 'MATH', 'nom' => 'Mathématiques', 'coefficient_defaut' => '4'])
            ->assertCreated()->json('data.uuid');

        return ['periode' => $periode, 'maths' => $maths, 'grille' => $grille];
    }

    protected function creerEvaluation(string $periode, string $matiere, array $champs = []): string
    {
        return $this->commeProf()->postJson('/v1/evaluations', array_merge([
            'periode_uuid' => $periode, 'matiere_uuid' => $matiere, 'classe_uuid' => $this->classe,
            'type' => 'devoir_surveille', 'libelle' => 'Devoir 1', 'date_evaluation' => '2026-10-15',
        ], $champs))->assertCreated()->json('data.uuid');
    }

    protected function saisir(string $evaluation, array $notes): TestResponse
    {
        return $this->commeProf()->postJson('/v1/notes', ['evaluation_uuid' => $evaluation, 'notes' => $notes]);
    }
}
