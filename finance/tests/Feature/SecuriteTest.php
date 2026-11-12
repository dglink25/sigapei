<?php

namespace Tests\Feature;

use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Barrières d'entrée de Finances : aucune route métier sans contexte Gateway signé,
 * aucun webhook sans signature valide de l'agrégateur.
 */
class SecuriteTest extends TestCase
{
    private const SECRET = 'secret-de-test-interne-0123456789abcdef';

    private function gateway(string $role, ?string $secret = self::SECRET): array
    {
        return array_filter([
            'X-Internal-Secret' => $secret,
            'X-Tenant-Id' => '1',
            'X-User-Id' => (string) Str::uuid(),
            'X-User-Role' => $role,
        ]);
    }

    public function test_route_metier_sans_secret_refusee(): void
    {
        $this->postJson('/v1/factures', [], $this->gateway('administrateur', null))->assertStatus(401);
    }

    public function test_role_non_autorise(): void
    {
        $this->putJson('/v1/decaissements/'.Str::uuid().'/valider', [], $this->gateway('personnel'))->assertStatus(403);
        $this->getJson('/v1/rapports/etablissement/'.Str::uuid(), $this->gateway('super_admin'))->assertStatus(403);
    }

    public function test_contexte_valide_atteint_le_controleur(): void
    {
        $this->postJson('/v1/factures', [], $this->gateway('administrateur'))->assertStatus(501);
    }

    public function test_webhook_fedapay_signature(): void
    {
        $corps = json_encode(['name' => 'transaction.approved', 'entity' => ['id' => 42]]);
        $t = (string) time();
        $signature = hash_hmac('sha256', $t.'.'.$corps, 'whsec_test_fedapay');

        $this->call('POST', '/v1/webhooks/fedapay', [], [], [], ['CONTENT_TYPE' => 'application/json'], $corps)->assertStatus(401);
        $this->call('POST', '/v1/webhooks/fedapay', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_FEDAPAY_SIGNATURE' => "t={$t},s=faux"], $corps)->assertStatus(401);

        // Rejeu d'une signature ancienne (hors fenêtre de 300 s)
        $vieux = (string) (time() - 3600);
        $sigVieille = hash_hmac('sha256', $vieux.'.'.$corps, 'whsec_test_fedapay');
        $this->call('POST', '/v1/webhooks/fedapay', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_FEDAPAY_SIGNATURE' => "t={$vieux},s={$sigVieille}"], $corps)->assertStatus(401);

        $this->call('POST', '/v1/webhooks/fedapay', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_FEDAPAY_SIGNATURE' => "t={$t},s={$signature}"], $corps)->assertStatus(501);
    }

    public function test_webhook_kkiapay_secret(): void
    {
        $this->postJson('/v1/webhooks/kkiapay', [], ['x-kkiapay-secret' => 'faux'])->assertStatus(401);
        $this->postJson('/v1/webhooks/kkiapay', [], ['x-kkiapay-secret' => 'kkiapay-secret-test'])->assertStatus(501);
    }

    public function test_interne_exige_le_secret(): void
    {
        $this->getJson('/v1/interne/revenus-consolides')->assertStatus(403);
        $this->getJson('/v1/interne/revenus-consolides', ['X-Internal-Secret' => self::SECRET])->assertStatus(501);
    }
}
