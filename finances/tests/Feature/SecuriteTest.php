<?php

namespace Tests\Feature;

use Illuminate\Support\Str;

class SecuriteTest extends FinancesTestCase
{
    public function test_sans_jeton_ou_jeton_invalide_refuse(): void
    {
        $this->getJson('/v1/factures')->assertStatus(401)->assertJsonPath('error.code', 'APPEL_NON_AUTORISE');
        $this->en('inconnu')->getJson('/v1/factures')->assertStatus(401)->assertJsonPath('error.code', 'JETON_INVALIDE');
    }

    public function test_super_admin_et_compte_sans_etablissement_refuses(): void
    {
        [$sa] = $this->utilisateur('super_admin');
        $this->en($sa)->getJson('/v1/mes-droits')->assertStatus(403)->assertJsonPath('error.code', 'ROLE_INVALIDE');

        $this->jetons['orphelin'] = ['sub' => (string) Str::uuid(), 'tenantId' => null, 'roleCode' => 'administrateur'];
        $this->en('orphelin')->getJson('/v1/mes-droits')->assertStatus(401)->assertJsonPath('error.code', 'TENANT_MANQUANT');
    }

    public function test_module_non_ouvert_au_profil(): void
    {
        [$jeton, $uuid] = $this->utilisateur('enseignant');
        $this->accesRefuse[$uuid] = true;

        $this->en($jeton)->getJson('/v1/mes-droits')->assertStatus(403)->assertJsonPath('error.code', 'MODULE_NON_AUTORISE');
    }

    public function test_en_tetes_gateway_sans_secret_ignores(): void
    {
        [$eleve] = $this->utilisateur('apprenant');

        $this->en($eleve)->withHeaders(['X-User-Role' => 'administrateur', 'X-Tenant-Id' => $this->autreEtab])
            ->getJson('/v1/mes-droits')->assertOk()->assertJsonPath('data.role', 'apprenant')->assertJsonPath('data.actions', []);
        $this->en($eleve)->getJson('/v1/factures')->assertStatus(403)->assertJsonPath('error.code', 'ACTION_NON_AUTORISEE');
    }

    public function test_gateway_avec_secret_valide(): void
    {
        $this->flushHeaders();
        $this->withHeaders(['X-Internal-Secret' => self::SECRET, 'X-Tenant-Id' => $this->etab, 'X-User-Id' => (string) Str::uuid(), 'X-User-Role' => 'administrateur'])
            ->getJson('/v1/factures')->assertOk();

        $this->flushHeaders();
        $this->withHeaders(['X-Internal-Secret' => 'faux-secret-faux-secret-faux-secret-00', 'X-Tenant-Id' => $this->etab, 'X-User-Id' => (string) Str::uuid(), 'X-User-Role' => 'administrateur'])
            ->getJson('/v1/factures')->assertStatus(401);
    }

    public function test_identite_injoignable_donne_503(): void
    {
        $this->identiteEnPanne = true;
        [$admin] = $this->utilisateur('administrateur');

        $this->en($admin)->getJson('/v1/factures')->assertStatus(503)->assertJsonPath('error.code', 'SERVICE_DEPENDANT_INDISPONIBLE');
    }

    public function test_routes_internes_exigent_le_secret(): void
    {
        $this->getJson('/v1/interne/solde/'.Str::uuid())->assertStatus(403);
        $this->postJson('/v1/interne/paiements/notification', ['encaissement_uuid' => (string) Str::uuid()])->assertStatus(403);
        $this->interne()->getJson('/v1/interne/solde/'.Str::uuid())->assertOk()->assertJsonPath('data.a_jour', true);
    }

    public function test_isolation_entre_etablissements(): void
    {
        [$admin] = $this->utilisateur('administrateur');
        [$autreAdmin] = $this->utilisateur('administrateur', $this->autreEtab);
        $formule = $this->creerFormule($admin)->assertCreated()->json('data.uuid');
        $f = $this->en($admin)->postJson('/v1/factures', ['apprenant_uuid' => $this->apprenant(), 'annee_scolaire' => '2026-2027', 'formules' => [$formule]])
            ->assertCreated()->json('data.uuid');

        $this->en($autreAdmin)->getJson("/v1/factures/{$f}")->assertNotFound();
        $this->en($autreAdmin)->getJson('/v1/factures')->assertOk()->assertJsonPath('data.pagination.total', 0);
        $this->en($autreAdmin)->patchJson("/v1/formules/{$formule}", ['libelle' => 'Piratage'])->assertNotFound();
    }

    public function test_lien_de_document_falsifie_ou_d_un_autre_etablissement_refuse(): void
    {
        [$admin] = $this->utilisateur('administrateur');
        $formule = $this->creerFormule($admin)->json('data.uuid');
        $f = $this->en($admin)->postJson('/v1/factures', ['apprenant_uuid' => $this->apprenant(), 'annee_scolaire' => '2026-2027', 'formules' => [$formule]])->json('data.uuid');
        $url = $this->en($admin)->getJson("/v1/factures/{$f}/pdf")->assertOk()->json('data.url');

        $this->flushHeaders();
        $this->get(str_replace($this->etab, $this->autreEtab, $url))->assertStatus(403)->assertJsonPath('error.code', 'LIEN_INVALIDE');
        $this->get(preg_replace('/signature=[0-9a-f]+/', 'signature=00', $url))->assertStatus(403);

        $pdf = $this->get($url)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $pdf->getContent());
    }
}
