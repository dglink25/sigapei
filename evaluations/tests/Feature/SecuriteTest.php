<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SecuriteTest extends ApiTestCase
{
    public function test_sonde_de_sante_publique(): void
    {
        $this->getJson('/health')->assertOk()->assertJsonPath('statut', 'ok');
    }

    public function test_contrat_openapi_publie(): void
    {
        $this->get('/docs')->assertOk()->assertJsonPath('openapi', '3.0.3')->assertJsonPath('info.title', 'SIGAPEI — API Évaluations');
    }

    public function test_contexte_gateway_sans_secret_refuse_meme_avec_un_role_administrateur(): void
    {
        $this->en('administrateur', $this->admin, secret: null)->getJson('/v1/matieres')
            ->assertStatus(401)->assertJsonPath('error.code', 'APPEL_NON_AUTORISE');
    }

    public function test_mauvais_secret_refuse(): void
    {
        $this->en('administrateur', $this->admin, secret: str_repeat('x', 40))->getJson('/v1/matieres')->assertStatus(401);
    }

    public function test_role_inconnu_ou_utilisateur_invalide_refuse(): void
    {
        $this->en('dieu', $this->admin)->getJson('/v1/matieres')->assertStatus(403);
        $this->en('administrateur', 'pas-un-uuid')->getJson('/v1/matieres')->assertStatus(401);
        $this->en('administrateur', $this->admin, tenant: 0)->getJson('/v1/matieres')->assertStatus(401);
    }

    public function test_role_non_autorise_sur_la_route(): void
    {
        $this->en('apprenant', $this->eleveUser)->postJson('/v1/matieres', ['code' => 'X', 'nom' => 'X', 'coefficient_defaut' => 1])
            ->assertStatus(403)->assertJsonPath('error.code', 'ACCES_REFUSE');
        $this->en('super_admin', (string) Str::uuid())->getJson('/v1/matieres')->assertStatus(403);
    }

    public function test_isolation_entre_etablissements(): void
    {
        $c = $this->configurer();

        // L'établissement 2 ne voit ni la matière ni la période de l'établissement 1.
        $this->commeAdmin(tenant: 2)->getJson('/v1/matieres')->assertOk()->assertJsonCount(0, 'data');
        $this->commeAdmin(tenant: 2)->putJson("/v1/matieres/{$c['maths']}", ['nom' => 'Piratage'])->assertNotFound();
        $this->commeAdmin(tenant: 2)->postJson("/v1/periodes/{$c['periode']}/cloturer")->assertNotFound();
        $this->assertSame('Mathématiques', DB::table('matieres')->value('nom'));
    }

    public function test_aucun_identifiant_interne_expose(): void
    {
        $c = $this->configurer();
        $reponse = $this->commeAdmin()->getJson('/v1/matieres')->assertOk()->json('data.0');

        $this->assertArrayNotHasKey('id', $reponse);
        $this->assertArrayNotHasKey('tenant_id', $reponse);
        $this->assertSame($c['maths'], $reponse['uuid']);
    }

    public function test_endpoint_interne_exige_le_secret(): void
    {
        $eleve = $this->ajouterApprenant();
        $this->getJson("/v1/interne/eligibilite-document/{$eleve}", ['X-Tenant-Id' => '1'])->assertStatus(403);
        $this->getJson("/v1/interne/eligibilite-document/{$eleve}", ['X-Tenant-Id' => '1', 'X-Internal-Secret' => 'secret-de-test-interne-0123456789abcdef'])
            ->assertOk()->assertJsonPath('data.eligible', false);
    }

    public function test_erreur_interne_sans_fuite_de_detail(): void
    {
        $this->commeAdmin()->getJson('/v1/parametres-notation/secondaire')
            ->assertStatus(409)->assertJsonPath('error.code', 'PARAMETRES_NON_CONFIGURES')->assertJsonMissingPath('error.detail');
    }
}
