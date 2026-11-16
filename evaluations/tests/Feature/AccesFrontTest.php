<?php

namespace Tests\Feature;

use Illuminate\Support\Str;

/**
 * Appel direct du front (sans Gateway) : Authorization: Bearer <jeton Identité>, vérifié par
 * introspection auprès d'Identité ; tenant uuid converti en tenant_id via Établissements.
 */
class AccesFrontTest extends ApiTestCase
{
    private string $etablissement;

    protected function setUp(): void
    {
        parent::setUp();
        $this->etablissement = (string) Str::uuid();
        $this->etablissements[$this->etablissement] = self::TENANT;
        $this->jetons['jeton-admin'] = ['sub' => $this->admin, 'tenantId' => $this->etablissement, 'roleCode' => 'administrateur'];
    }

    private function bearer(string $jeton): static
    {
        $this->flushHeaders();

        return $this->withHeaders(['Authorization' => 'Bearer '.$jeton]);
    }

    public function test_jeton_valide_donne_acces_au_bon_etablissement(): void
    {
        $c = $this->configurer();

        $this->bearer('jeton-admin')->getJson('/v1/matieres')->assertOk()
            ->assertJsonPath('data.0.uuid', $c['maths']);
    }

    public function test_jeton_invalide_ou_absent_refuse(): void
    {
        $this->bearer('jeton-inconnu')->getJson('/v1/matieres')->assertStatus(401)->assertJsonPath('error.code', 'JETON_INVALIDE');
        $this->flushHeaders();
        $this->getJson('/v1/matieres')->assertStatus(401)->assertJsonPath('error.code', 'APPEL_NON_AUTORISE');
    }

    public function test_en_tetes_gateway_sans_secret_ignores_le_contexte_vient_d_identite(): void
    {
        // Un navigateur qui se déclare administrateur d'un autre établissement n'obtient rien de plus.
        $this->jetons['jeton-eleve'] = ['sub' => $this->eleveUser, 'tenantId' => $this->etablissement, 'roleCode' => 'apprenant'];

        $this->bearer('jeton-eleve')->withHeaders(['X-User-Role' => 'administrateur', 'X-Tenant-Id' => '2'])
            ->postJson('/v1/matieres', ['code' => 'X', 'nom' => 'X', 'coefficient_defaut' => 1])
            ->assertStatus(403);
    }

    public function test_role_personnalise_refuse(): void
    {
        $this->jetons['jeton-comptable'] = ['sub' => (string) Str::uuid(), 'tenantId' => $this->etablissement, 'roleCode' => 'comptable'];

        $this->bearer('jeton-comptable')->getJson('/v1/matieres')->assertStatus(403)->assertJsonPath('error.code', 'ROLE_INVALIDE');
    }

    public function test_etablissement_inconnu_ou_absent_refuse(): void
    {
        $this->jetons['jeton-orphelin'] = ['sub' => (string) Str::uuid(), 'tenantId' => (string) Str::uuid(), 'roleCode' => 'administrateur'];
        $this->jetons['jeton-plateforme'] = ['sub' => (string) Str::uuid(), 'tenantId' => null, 'roleCode' => 'super_admin'];

        $this->bearer('jeton-orphelin')->getJson('/v1/matieres')->assertStatus(401)->assertJsonPath('error.code', 'TENANT_MANQUANT');
        $this->bearer('jeton-plateforme')->getJson('/v1/matieres')->assertStatus(401)->assertJsonPath('error.code', 'TENANT_MANQUANT');
    }

    public function test_module_non_ouvert_au_profil_refuse(): void
    {
        $this->sansAcces[strtolower($this->admin)] = true;

        $this->bearer('jeton-admin')->getJson('/v1/matieres')->assertStatus(403)->assertJsonPath('error.code', 'MODULE_NON_AUTORISE');
    }

    public function test_identite_injoignable_donne_503_jamais_un_acces(): void
    {
        $this->identiteEnPanne = true;

        $this->bearer('jeton-admin')->getJson('/v1/matieres')->assertStatus(503)->assertJsonPath('error.code', 'SERVICE_DEPENDANT_INDISPONIBLE');
    }

    public function test_introspection_mise_en_cache_par_empreinte_du_jeton(): void
    {
        $this->bearer('jeton-admin')->getJson('/v1/matieres')->assertOk();
        $this->bearer('jeton-admin')->getJson('/v1/matieres')->assertOk();

        $this->assertSame(1, $this->appelsIntrospection);
    }

    public function test_gateway_peut_transmettre_l_uuid_de_l_etablissement(): void
    {
        $c = $this->configurer();

        $this->en('administrateur', $this->admin)->withHeaders(['X-Tenant-Id' => $this->etablissement])
            ->getJson('/v1/matieres')->assertOk()->assertJsonPath('data.0.uuid', $c['maths']);
    }

    public function test_route_interne_accepte_l_uuid_de_l_etablissement(): void
    {
        $this->flushHeaders();
        $this->getJson('/v1/interne/eligibilite-document/'.Str::uuid(), [
            'X-Internal-Secret' => 'secret-de-test-interne-0123456789abcdef',
            'X-Tenant-Id' => $this->etablissement,
        ])->assertOk()->assertJsonPath('data.eligible', false);
    }
}
