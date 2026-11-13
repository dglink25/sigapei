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

    /** Paiements refuse l'encaissement (accord absent pour l'agrégateur). */
    protected bool $paiementRefuse = false;

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

            // Microservice Paiements : réponses au format réel ({success: true, ...} à plat, erreurs {success: false, error}).
            if (preg_match('#^http://paiement\.test/v1/etablissements/([0-9a-f-]{36})/encaissements(?:/([0-9a-f-]{36}))?$#', strtok($url, '?'), $m) === 1) {
                if ($this->paiementEnPanne) {
                    return Http::response([], 502);
                }
                if ($r->method() === 'POST') {
                    if ($this->paiementRefuse) {
                        return Http::response(['success' => false, 'error' => ['code' => 'ACCORD_ABSENT', 'message' => 'Aucun accord actif pour fedapay en XOF.']], 403);
                    }
                    $this->demandesPaiement[] = $r->data() + ['cle' => $r->header('Idempotency-Key')[0] ?? ''];
                    $e = [
                        'uuid' => (string) Str::uuid(), 'etablissement_uuid' => $m[1], 'objet_type' => $r->data()['objetType'],
                        'objet_uuid' => $r->data()['objetUuid'], 'devise' => $r->data()['devise'], 'montant' => (string) $r->data()['montant'],
                        'montant_rembourse' => '0', 'statut' => 'initie', 'approuve_le' => null,
                    ];
                    $this->encaissements[$e['uuid']] = $e;

                    return Http::response(['success' => true, 'uuid' => $e['uuid'], 'referenceMarchande' => 'ENC-'.Str::random(8),
                        'urlPaiement' => 'https://checkout.agregateur.test/p/'.Str::random(10), 'statut' => 'initie'], 201);
                }
                $e = $this->encaissements[$m[2] ?? ''] ?? null;

                return $e === null || strtolower($e['etablissement_uuid']) !== $m[1]
                    ? Http::response(['success' => false, 'error' => ['code' => 'ENCAISSEMENT_INTROUVABLE']], 404)
                    : Http::response(['success' => true] + $e);
            }

            return Http::response([], 404);
        });
    }
}
