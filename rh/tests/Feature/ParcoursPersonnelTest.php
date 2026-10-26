<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Parcours RH : création du personnel, affectation (règle 5), vérification interne
 * consommée par E-learning / Évaluations, isolation multi-tenant.
 */
class ParcoursPersonnelTest extends ApiTestCase
{
    public function test_creation_personnel_puis_affectation(): void
    {
        $reponse = $this->api('POST', '/v1/personnel', [
            'matricule' => 'ENS-001',
            'nom' => 'DOSSOU',
            'prenom' => 'Alice',
            'type_personnel' => 'enseignant',
        ])->assertCreated();

        $personnelUuid = $reponse->json('data.uuid');
        $this->assertNotEmpty($personnelUuid);

        $matiere = (string) Str::uuid();
        $classe = (string) Str::uuid();

        $this->api('POST', '/v1/affectations', [
            'personnel_uuid' => $personnelUuid,
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
            'annee_scolaire' => '2026-2027',
        ])->assertCreated();
    }

    public function test_verification_affectation_interne(): void
    {
        $personnel = $this->creerPersonnel();
        $matiere = (string) Str::uuid();
        $classe = (string) Str::uuid();

        DB::table('affectations')->insert([
            'uuid' => (string) Str::uuid(),
            'tenant_id' => self::TENANT,
            'personnel_id' => DB::table('personnel')->where('uuid', $personnel)->value('id'),
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
            'annee_scolaire' => '2026-2027',
            'statut' => 'actif',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->interne('/v1/interne/affectations/verifier', [
            'tenant_id' => self::TENANT,
            'enseignant_uuid' => $personnel,
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
        ])->assertOk()->assertJsonPath('data.affecte', true);

        $this->interne('/v1/interne/affectations/verifier', [
            'tenant_id' => self::TENANT,
            'enseignant_uuid' => $personnel,
            'matiere_uuid' => (string) Str::uuid(),
            'classe_uuid' => $classe,
        ])->assertOk()->assertJsonPath('data.affecte', false);
    }

    public function test_isolation_tenant(): void
    {
        $uuid = $this->creerPersonnel([], 2);

        $this->interne('/v1/interne/personnel', [
            'tenant_id' => self::TENANT,
            'uuid' => $uuid,
        ])->assertOk()->assertJsonPath('data', null);

        $this->interne('/v1/interne/personnel', [
            'tenant_id' => 2,
            'uuid' => $uuid,
        ])->assertOk()->assertJsonPath('data.uuid', $uuid);
    }

    public function test_pas_de_suppression_physique(): void
    {
        $personnel = $this->creerPersonnel();

        $this->api('DELETE', "/v1/personnel/{$personnel}")->assertStatus(405);
    }

    public function test_interne_exige_secret(): void
    {
        $this->get('/v1/interne/personnel?tenant_id=1', ['Accept' => 'application/json'])
            ->assertStatus(403);
    }

    public function test_liste_des_affectations_d_un_enseignant(): void
    {
        $personnel = $this->creerPersonnel();
        $matiere = (string) Str::uuid();
        $classe = (string) Str::uuid();

        DB::table('affectations')->insert([
            'uuid' => (string) Str::uuid(),
            'tenant_id' => self::TENANT,
            'personnel_id' => DB::table('personnel')->where('uuid', $personnel)->value('id'),
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
            'annee_scolaire' => '2026-2027',
            'statut' => 'actif',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->api('GET', "/v1/personnel/{$personnel}/affectations")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.matiere_uuid', $matiere)
            ->assertJsonPath('data.0.classe_uuid', $classe);

        // Filtre sur une autre année scolaire : aucune affectation.
        $this->api('GET', "/v1/personnel/{$personnel}/affectations?annee_scolaire=2025-2026")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
