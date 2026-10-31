<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Base des tests : vraie base PostgreSQL (contraintes et triggers compris) ; Identité, Scolarité et Paiement
 * simulés au niveau HTTP selon les contrats d'interface.
 */
abstract class FinancesTestCase extends TestCase
{
    use RefreshDatabase;

    protected const SECRET = 'secret-de-test-interne-0123456789abcdef';

    protected string $etab;

    protected string $autreEtab;

    protected string $classe;

    /** @var array<string, array{sub: string, tenantId: ?string, roleCode: string}> */
    protected array $jetons = [];

    /** @var array<string, bool> accès au module refusé par Identité */
    protected array $accesRefuse = [];

    /** @var array<string, array<string, mixed>> apprenants (établissement courant) */
    protected array $apprenants = [];

    /** @var array<string, array<string, mixed>> encaissements connus du service Paiement simulé */
    public array $encaissements = [];

    /** @var list<array<string, mixed>> demandes reçues par Paiement */
    public array $demandesPaiement = [];

    protected bool $identiteEnPanne = false;

    protected bool $paiementEnPanne = false;

    protected function beforeRefreshingDatabase()
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS finances');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->etab = (string) Str::uuid();
        $this->autreEtab = (string) Str::uuid();
        $this->classe = (string) Str::uuid();
        $this->simuler();
    }

    /** Crée un utilisateur et son jeton ; renvoie [jeton, uuid]. */
    protected function utilisateur(string $role, ?string $etab = null): array
    {
        $uuid = (string) Str::uuid();
        $jeton = 'jeton-'.$role.'-'.Str::random(8);
        $this->jetons[$jeton] = ['sub' => $uuid, 'tenantId' => $etab ?? $this->etab, 'roleCode' => $role];

        return [$jeton, $uuid];
    }

    protected function en(string $jeton): static
    {
        $this->flushHeaders();

        return $this->withHeaders(['Authorization' => 'Bearer '.$jeton]);
    }

    protected function apprenant(array $champs = []): string
    {
        $uuid = (string) Str::uuid();
        $n = count($this->apprenants);
        $this->apprenants[$uuid] = array_merge([
            'uuid' => $uuid, 'nom' => 'NOM'.$n, 'prenom' => 'Prenom', 'matricule' => 'MAT'.$n, 'statut' => 'actif',
            'utilisateur_uuid' => null,
            'classe' => ['uuid' => $this->classe, 'nom' => '6e A', 'cycle' => 'secondaire', 'niveau' => '6e'],
            'parents' => [],
        ], $champs);

        return $uuid;
    }

    protected function interne(): static
    {
        $this->flushHeaders();

        return $this->withHeaders(['X-Internal-Secret' => self::SECRET]);
    }

    protected function creerFormule(string $jeton, array $champs = []): TestResponse
    {
        return $this->en($jeton)->postJson('/v1/formules', array_merge([
            'code' => 'scolarite-6e', 'libelle' => 'Scolarité 6e', 'nature' => 'scolarite', 'annee_scolaire' => '2026-2027',
            'cycle' => 'secondaire', 'niveau' => '6e', 'montant' => 150000,
            'echeancier' => [
                ['libelle' => 'Tranche 1', 'date_echeance' => now()->subDays(1)->toDateString(), 'montant' => 100000],
                ['libelle' => 'Tranche 2', 'date_echeance' => now()->addMonths(2)->toDateString(), 'montant' => 50000],
            ],
        ], $champs));
    }

    private function simuler(): void
    {
        Http::preventStrayRequests();
        Http::fake(function (Request $r) {
            if (($r->header('X-Internal-Secret')[0] ?? null) !== self::SECRET) {
                return Http::response(['success' => false], 403);
            }
            $url = $r->url();
            parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
            $tenant = strtolower($r->header('X-Tenant-Id')[0] ?? '');

            if (str_starts_with($url, 'http://identite.test/v1/interne/introspection')) {
                if ($this->identiteEnPanne) {
                    return Http::response([], 500);
                }
                $ctx = $this->jetons[$q['token'] ?? ''] ?? null;

                return Http::response($ctx === null ? ['valide' => false] : ['valide' => true] + $ctx);
            }
            if (str_starts_with($url, 'http://identite.test/v1/interne/acces')) {
                return Http::response(['autorise' => ! isset($this->accesRefuse[$q['utilisateurUuid'] ?? ''])]);
            }

            if (str_starts_with($url, 'http://scolarite.test/v1/interne/apprenants')) {
                $liste = $tenant === $this->etab ? $this->apprenants : [];
                if (isset($q['uuid'])) {
                    return Http::response(['succes' => true, 'donnees' => $liste[$q['uuid']] ?? null]);
                }
                $filtre = fn ($a) => match (true) {
                    isset($q['classe_uuid']) => $a['classe']['uuid'] === $q['classe_uuid'] && $a['statut'] === ($q['statut'] ?? $a['statut']),
                    isset($q['utilisateur_uuid']) => $a['utilisateur_uuid'] === $q['utilisateur_uuid'],
                    isset($q['parent_uuid']) => in_array($q['parent_uuid'], array_column($a['parents'], 'parent_uuid'), true),
                    default => true,
                };

                return Http::response(['succes' => true, 'donnees' => array_values(array_filter($liste, $filtre))]);
            }

            if (str_starts_with($url, 'http://paiement.test/v1/interne/encaissements')) {
                if ($this->paiementEnPanne) {
                    return Http::response([], 502);
                }
                if ($r->method() === 'POST') {
                    $cle = $r->header('Idempotency-Key')[0] ?? '';
                    $this->demandesPaiement[] = $r->data() + ['cle' => $cle];
                    $existant = collect($this->encaissements)->firstWhere('cle', $cle);
                    $e = $existant ?? [
                        'uuid' => (string) Str::uuid(), 'cle' => $cle, 'etablissement_uuid' => $r->data()['etablissement_uuid'],
                        'objet_type' => $r->data()['objet_type'], 'objet_uuid' => $r->data()['objet_uuid'], 'devise' => $r->data()['devise'],
                        'montant' => $r->data()['montant'], 'montant_rembourse' => 0, 'statut' => 'en_attente', 'approuve_le' => null,
                        'url_paiement' => 'https://checkout.agregateur.test/p/'.Str::random(10), 'expire_le' => now()->addMinutes(30)->toIso8601String(),
                    ];
                    $this->encaissements[$e['uuid']] = $e;

                    return Http::response(['success' => true, 'data' => array_diff_key($e, ['cle' => 1])], 201);
                }
                $uuid = basename((string) parse_url($url, PHP_URL_PATH));
                $e = $this->encaissements[$uuid] ?? null;

                return $e === null || strtolower($e['etablissement_uuid']) !== $tenant
                    ? Http::response(['success' => false], 404)
                    : Http::response(['success' => true, 'data' => array_diff_key($e, ['cle' => 1])]);
            }

            return Http::response([], 404);
        });
    }
}
