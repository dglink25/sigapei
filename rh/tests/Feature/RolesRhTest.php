<?php

namespace Tests\Feature;

/**
 * Moteur de rôles RH configurables (CDC RH §5.7 / §7.7-7.9) :
 * création de rôle, sélection des fonctions, attribution au personnel,
 * isolation multi-tenant et absence de suppression physique.
 */
class RolesRhTest extends ApiTestCase
{
    private function creerRole(array $donnees = []): string
    {
        $reponse = $this->api('POST', '/v1/roles-rh', $donnees ?: [
            'nom' => 'Chef de département',
            'description' => 'Responsable pédagogique',
            'fonctions' => ['dossiers', 'conges'],
        ])->assertCreated();

        return $reponse->json('data.uuid');
    }

    public function test_creation_role_avec_fonctions(): void
    {
        $roleUuid = $this->creerRole();

        $this->api('GET', "/v1/roles-rh/{$roleUuid}")
            ->assertOk()
            ->assertJsonPath('data.nom', 'Chef de département')
            ->assertJsonPath('data.statut', 'actif')
            ->assertJsonCount(2, 'data.modules');
    }

    public function test_fonction_inconnue_refusee(): void
    {
        $this->api('POST', '/v1/roles-rh', [
            'nom' => 'Rôle invalide',
            'fonctions' => ['direction_generale'],
        ])->assertStatus(422);
    }

    public function test_nom_unique_par_tenant(): void
    {
        $this->creerRole();

        $this->api('POST', '/v1/roles-rh', [
            'nom' => 'Chef de département',
        ])->assertStatus(409);
    }

    public function test_selection_des_fonctions_du_role(): void
    {
        $roleUuid = $this->creerRole();

        $this->api('PATCH', "/v1/roles-rh/{$roleUuid}/modules", [
            'fonctions' => ['affectations'],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data.modules')
            ->assertJsonPath('data.modules.0.fonction', 'affectations');
    }

    public function test_attribution_et_retrait_role_rh(): void
    {
        $personnel = $this->creerPersonnel();
        $roleUuid = $this->creerRole();

        $this->api('POST', "/v1/personnel/{$personnel}/roles-rh", [
            'role_rh_uuid' => $roleUuid,
        ])->assertCreated();

        // Attribution en double refusée.
        $this->api('POST', "/v1/personnel/{$personnel}/roles-rh", [
            'role_rh_uuid' => $roleUuid,
        ])->assertStatus(409);

        $this->api('GET', "/v1/personnel/{$personnel}/roles-rh")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.uuid', $roleUuid);

        $this->api('POST', "/v1/personnel/{$personnel}/roles-rh/{$roleUuid}/retirer")
            ->assertOk();

        $this->api('GET', "/v1/personnel/{$personnel}/roles-rh")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_role_archive_non_attribuable(): void
    {
        $personnel = $this->creerPersonnel();
        $roleUuid = $this->creerRole();

        $this->api('POST', "/v1/roles-rh/{$roleUuid}/archiver")->assertOk();

        $this->api('POST', "/v1/personnel/{$personnel}/roles-rh", [
            'role_rh_uuid' => $roleUuid,
        ])->assertStatus(409);
    }

    public function test_moteur_rh_affiche_les_fonctions_attribuees(): void
    {
        $this->creerPersonnel(['utilisateur_uuid' => $this->admin]);
        $roleUuid = $this->creerRole(['nom' => 'Chef de département', 'fonctions' => ['dossiers', 'conges']]);

        $personnelUuid = $this->api('GET', '/v1/personnel')->assertOk()->json('data.0.uuid');

        $this->api('POST', "/v1/personnel/{$personnelUuid}/roles-rh", [
            'role_rh_uuid' => $roleUuid,
        ])->assertCreated();

        $this->api('GET', '/v1/rh/mes-fonctions')
            ->assertOk()
            ->assertJsonPath('data.fonctions.0', 'dossiers')
            ->assertJsonPath('data.fonctions.1', 'conges');
    }

    public function test_roles_d_un_autre_tenant_ne_sont_pas_visibles(): void
    {
        $this->creerRole(['nom' => 'Chef de département', 'fonctions' => ['conges']]);

        // Même utilisateur, mais contexte tenant 2 : aucun rôle n'y existe.
        $this->api('GET', '/v1/rh/mes-fonctions', [], ['X-Tenant-Id' => '2'])
            ->assertOk()
            ->assertJsonPath('data.fonctions', []);

        $this->api('GET', '/v1/roles-rh', [], ['X-Tenant-Id' => '2'])
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_roles_rh_acquis_aux_autres_roles_plateforme(): void
    {
        // Le rôle « personnel » ne peut pas créer de rôle RH.
        $this->api('POST', '/v1/roles-rh', ['nom' => 'Rôle'], ['X-User-Role' => 'personnel'])
            ->assertStatus(403);

        // Le Super Administrateur de plateforme n'a accès à aucune donnée RH.
        $this->api('GET', '/v1/roles-rh', [], ['X-User-Role' => 'super_admin'])
            ->assertStatus(403);
    }

    public function test_roles_rh_sans_suppression_physique(): void
    {
        $roleUuid = $this->creerRole();

        $this->api('DELETE', "/v1/roles-rh/{$roleUuid}")->assertStatus(405);
    }
}
