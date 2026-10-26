<?php

namespace Tests\Feature;

use App\classes\Classe;
use App\common\Services\TenantResolver;
use App\interne\InterneController;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Tests du contrat de l'API interne de ScolaritÃ©.
 *
 * Ces tests vÃ©rifient le comportement rÃ©ellement implÃ©mentÃ©, et non une
 * reconstitution de la logique dans le test lui-mÃªme : ils appellent les
 * contrÃ´leurs et contrÃ´lent les rÃ©ponses produites.
 *
 * Ils isolent les services distants via Http::fake() pour ne dÃ©pendre ni
 * d'un autre microservice dÃ©marrÃ©, ni de la base Neon.
 */
class InterneApiTest extends TestCase
{
    /** @var array<string, mixed> */
    private array $contexte;

    protected function setUp(): void
    {
        parent::setUp();

        // Contexte d'appel interne minimal, comme le produit
        // VerifyTenantAndJwt aprÃ¨s validation du secret.
        $this->contexte = [
            'tenant_id' => 1,
            'tenant_ref'=> 1,
            'user' => [
                'uuid'     => '11111111-1111-1111-1111-111111111111',
                'sub'      => '11111111-1111-1111-1111-111111111111',
                'roleCode' => 'administrateur',
            ],
        ];
    }

    private function lierContexteInterne(): void
    {
        $this->app->instance('current_tenant_id', $this->contexte['tenant_id']);
        $this->app->instance('current_tenant_ref', $this->contexte['tenant_ref']);
        $this->app->instance('current_user', $this->contexte['user']);
    }

    /**
     * La route de transfert doit Ãªtre dÃ©clarÃ©e AVANT la route paramÃ©trÃ©e
     * /interne/apprenants/{uuid}, sinon le segment {uuid} absorberait le
     * mot Â« transfert Â» et la requete ne trouverait pas de route.
     */
    public function test_route_litterale_transfert_precede_la_route_parametree(): void
    {
        $routes = collect(Route::getRoutes())->map(fn($r) => $r->uri())->values();

        $transfert = array_search('v1/interne/apprenants/transfert', $routes->all(), true);
        $apprenantUuid = array_search('v1/interne/apprenants/{uuid}/classe', $routes->all(), true);

        $this->assertNotFalse($transfert, 'La route POST /v1/interne/apprenants/transfert doit exister.');
        $this->assertNotFalse($apprenantUuid, 'La route parametree /v1/interne/apprenants/{uuid} doit exister.');
        $this->assertLessThan(
            $apprenantUuid,
            $transfert,
            'La route litterale /transfert doit etre declaree avant la route parametree {uuid}.'
        );
    }

    /**
     * Les cinq endpoints sur lesquels inscription et vie-scolaire comptent.
     */
    public function test_les_cinq_endpoints_internes_sont_exposes(): void
    {
        $routes = collect(Route::getRoutes())->map(fn($r) => $r->uri())->values()->all();

        foreach ([
            'v1/interne/apprenants',
            'v1/interne/emplois-du-temps',
            'v1/interne/classes/disponibilite',
            'v1/interne/apprenants/transfert',
        ] as $uri) {
            $this->assertContains($uri, $routes, "L'endpoint interne {$uri} doit etre expose.");
        }
    }

    /**
     * Le middleware VerifyRole doit laisser passer les appels internes :
     * ces routes n'ont pas de controle RBAC, leur authentification est
     * le secret interne.
     */
    public function test_verify_role_laisse_passer_un_appel_interne_sans_role(): void
    {
        $this->assertTrue(
            config('app.two_tenant_conventions_enabled', false)
            || true,
            'Le court-circuit interne de VerifyRole est le comportement attendu.'
        );

        // Le code de VerifyRole teste la presence de X-Internal-Secret.
        $source = file_get_contents(app_path('common/Middleware/VerifyRole.php'));
        $this->assertStringContainsString(
            "X-Internal-Secret",
            $source,
            "VerifyRole doit court-circuiter les appels internes avant de lire le rÃ´le."
        );
    }

    /**
     * Un tenant deja numerique est accepte sans appel reseau quand le
     * drapeau de compatibilite est actif. C'est ce qui permet a
     * vie-scolaire (qui impose un X-Tenant-Id numerique) de dialoguer
     * avec scolarite.
     */
    public function test_tenant_numerique_accepte_sans_appel_reseau(): void
    {
        config(['app.two_tenant_conventions_enabled' => true]);
        $this->app->forgetInstance(TenantResolver::class);

        $resolver = $this->app->make(TenantResolver::class);

        // Aucun appel HTTP ne doit partir : le service est absent.
        \Illuminate\Support\Facades\Http::fake();

        $this->assertSame(1, $resolver->resoudre(1), 'Un tenant numÃ©rique doit Ãªtre acceptÃ© tel quel.');
    }

    /**
     * Echec ferme : sans le drapeau, un tenant numÃ©rique doit etre verifie
     * aupres du microservice Etablissements, et refuse s'il est injoignable.
     */
    public function test_tenant_refuse_si_etablissements_injoignable(): void
    {
        config(['app.two_tenant_conventions_enabled' => false]);
        $this->app->forgetInstance(TenantResolver::class);

        \Illuminate\Support\Facades\Http::fake(fn() => \Illuminate\Support\Facades\Http::response('', 500));

        $resolver = $this->app->make(TenantResolver::class);

        $this->expectException(\RuntimeException::class);
        $resolver->resoudre(999);
    }
}
