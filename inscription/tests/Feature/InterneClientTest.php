<?php

namespace Tests\Feature;

use App\common\Services\InterneClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tests du client d'appels internes d'Inscription.
 *
 * Ces tests figent deux bugs corrigés après exécution contre Neon :
 * l'absence de X-Tenant-Id, et le double encodage des paramètres de
 * requête qui produisait ?query[id]=3 au lieu de ?id=3.
 */
class InterneClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Un secret exploitable : InterneClient refuse explicitement les
        // placeholders (voir SECRETS_PLACEHOLDERS), ce que le test dédié
        // vérifie par ailleurs.
        config(['services.interne.secret' => 'secret-de-test-suffisamment-long']);

        app()->instance('current_tenant_id', 1);
        app()->instance('current_tenant_ref', '1');
        app()->instance('current_user', [
            'uuid'     => '11111111-1111-1111-1111-111111111111',
            'sub'      => '11111111-1111-1111-1111-111111111111',
            'roleCode' => 'administrateur',
        ]);
    }

    /**
     * Les paramètres de requête doivent arriver à plat. Le contrôleur cible
     * teste `if ($uuid = $request->query('uuid'))` : un `?query[uuid]=...`
     * ne satisfait pas ce test et provoquait un 422.
     */
    public function test_les_parametres_de_requete_sont_encodes_a_plat(): void
    {
        Http::fake(['*' => Http::response(['donnees' => ['nom' => '6eme A']])]);

        $client = app(InterneClient::class);
        $client->get('scolarite', '/v1/interne/classes/disponibilite', ['id' => 3]);

        Http::assertSent(function ($request) {
            $url = $request->url();

            $this->assertStringNotContainsString('query[', $url, 'Les paramètres ne doivent pas être imbriqués sous « query ».');

            parse_str((string) parse_url($url, PHP_URL_QUERY), $params);

            $this->assertArrayHasKey('id', $params, 'Le paramètre id doit être présent dans l\'URL.');
            $this->assertSame('3', $params['id']);

            return true;
        });
    }

    /**
     * X-Tenant-Id est obligatoire : sans lui, le microservice cible répond
     * 403 TENANT_MANQUANT car il ne peut pas cloisonner la requête.
     */
    public function test_les_appels_interne_transportent_le_tenant_courant(): void
    {
        Http::fake(['*' => Http::response(['donnees' => []])]);

        $client = app(InterneClient::class);
        $client->get('scolarite', '/v1/interne/apprenants');

        Http::assertSent(function ($request) {
            $this->assertSame(
                '1',
                $request->header('X-Tenant-Id')[0] ?? null,
                'X-Tenant-Id doit transmettre le tenant courant.'
            );

            return true;
        });
    }

    /**
     * Le contexte utilisateur est relayé pour que le microservice cible
     * puisse journaliser l'auteur de l'action.
     */
    public function test_les_appels_interne_relayent_le_contexte_utilisateur(): void
    {
        Http::fake(['*' => Http::response(['donnees' => []])]);

        $client = app(InterneClient::class);
        $client->get('scolarite', '/v1/interne/apprenants');

        Http::assertSent(function ($request) {
            $this->assertSame(
                '11111111-1111-1111-1111-111111111111',
                $request->header('X-User-Id')[0] ?? null,
                'X-User-Id doit transmettre l\'UUID de l\'utilisateur.'
            );
            $this->assertSame(
                'administrateur',
                $request->header('X-User-Role')[0] ?? null,
                'X-User-Role doit transmettre le rôle.'
            );

            return true;
        });
    }

    /**
     * Un secret interne absent, laissé à sa valeur d'exemple, ou trop court
     * doit bloquer l'appel AVANT qu'il parte sur le réseau : un appel
     * porteur d'un en-tête vide reste une requête non authentifiée.
     */
    public function test_un_secret_interne_absent_est_refuse(): void
    {
        config(['services.interne.secret' => null]);

        Http::fake();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('non configuré');

        app(InterneClient::class)->get('scolarite', '/v1/interne/apprenants');
    }

    /**
     * Le placeholder laissé par défaut doit être refusé lui aussi.
     */
    public function test_un_secret_interne_placeholder_est_refuse(): void
    {
        config(['services.interne.secret' => 'change-me-shared-secret-gateway']);

        Http::fake();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('placéholder');

        app(InterneClient::class)->get('scolarite', '/v1/interne/apprenants');
    }

    /**
     * Aucun appel ne doit partir lorsque le secret est refusé.
     */
    public function test_aucun_appel_ne_part_avec_un_secret_refuse(): void
    {
        config(['services.interne.secret' => 'change-me']);

        Http::fake();

        try {
            app(InterneClient::class)->get('scolarite', '/v1/interne/apprenants');
        } catch (\RuntimeException) {
            // attendu
        }

        Http::assertNothingSent();
    }
}
