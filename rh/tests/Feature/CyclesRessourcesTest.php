<?php

namespace Tests\Feature;

use Illuminate\Support\Str;

/**
 * Cycles de vie des ressources RH (grades, contrats, affectations, congés) et
 * contrat des endpoints internes consommés par Évaluations et Vie scolaire.
 */
class CyclesRessourcesTest extends ApiTestCase
{
    public function test_grade_creation_et_conflit(): void
    {
        $this->api('POST', '/v1/grades', ['code' => 'ENS-1', 'libelle' => 'Enseignant grade 1'])
            ->assertCreated()
            ->assertJsonPath('data.code', 'ENS-1');

        $this->api('POST', '/v1/grades', ['code' => 'ENS-1', 'libelle' => 'Doublon'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CODE_DEJA_UTILISE');
    }

    public function test_role_suffisant_requis(): void
    {
        $this->api('POST', '/v1/grades', ['code' => 'X-1', 'libelle' => 'x'], ['X-User-Role' => 'personnel'])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'ACCES_REFUSE');

        $this->api('POST', '/v1/personnel', [
            'matricule' => 'NOPE-1',
            'nom' => 'N',
            'prenom' => 'P',
            'type_personnel' => 'enseignant',
        ], ['X-User-Role' => 'enseignant'])->assertStatus(403);
    }

    public function test_contrat_unique_actif_puis_cloture(): void
    {
        $p = $this->creerPersonnel();

        $uuid = $this->api('POST', '/v1/contrats', [
            'personnel_uuid' => $p,
            'type_contrat' => 'CDI',
            'date_debut' => '2026-09-01',
        ])->assertCreated()->json('data.uuid');

        $this->api('POST', '/v1/contrats', [
            'personnel_uuid' => $p,
            'type_contrat' => 'CDD',
            'date_debut' => '2026-10-01',
        ])->assertStatus(409)->assertJsonPath('error.code', 'CONTRAT_ACTIF_EXISTANT');

        $this->api('POST', "/v1/contrats/{$uuid}/cloturer", ['date_fin' => '2026-12-31'])
            ->assertOk()->assertJsonPath('data.statut', 'termine');

        $this->api('POST', "/v1/contrats/{$uuid}/cloturer", ['date_fin' => '2027-01-05'])
            ->assertStatus(409)->assertJsonPath('error.code', 'CONTRAT_DEJA_CLOTURE');

        $this->api('POST', '/v1/contrats', [
            'personnel_uuid' => $p,
            'type_contrat' => 'CDD',
            'date_debut' => '2027-01-01',
        ])->assertCreated();
    }

    public function test_affectation_unique_active_puis_reajout_apres_cloture(): void
    {
        $p = $this->creerPersonnel();
        $matiere = (string) Str::uuid();
        $classe = (string) Str::uuid();

        $payload = [
            'personnel_uuid' => $p,
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
            'annee_scolaire' => '2026-2027',
            'date_debut' => '2026-09-01',
        ];

        $uuid = $this->api('POST', '/v1/affectations', $payload)
            ->assertCreated()->json('data.uuid');

        $this->api('POST', '/v1/affectations', $payload)
            ->assertStatus(409)->assertJsonPath('error.code', 'AFFECTATION_DEJA_ACTIVE');

        $this->api('POST', "/v1/affectations/{$uuid}/cloturer", ['date_fin' => '2026-12-31'])
            ->assertOk()->assertJsonPath('data.statut', 'termine');

        $this->api('POST', "/v1/affectations/{$uuid}/cloturer", ['date_fin' => '2027-01-01'])
            ->assertStatus(409)->assertJsonPath('error.code', 'AFFECTATION_DEJA_TERMINEE');

        $this->api('POST', '/v1/affectations', $payload)->assertCreated();
    }

    public function test_affectation_refusee_si_personnel_inactif(): void
    {
        $p = $this->creerPersonnel(['statut' => 'inactif', 'actif' => false]);

        $this->api('POST', '/v1/affectations', [
            'personnel_uuid' => $p,
            'matiere_uuid' => (string) Str::uuid(),
            'classe_uuid' => (string) Str::uuid(),
            'annee_scolaire' => '2026-2027',
        ])->assertStatus(409)->assertJsonPath('error.code', 'PERSONNEL_INACTIF');
    }

    public function test_conge_approbation_refus_et_transitions(): void
    {
        $p = $this->creerPersonnel();

        $conge = $this->api('POST', '/v1/conges', [
            'personnel_uuid' => $p,
            'type_conge' => 'annuel',
            'date_debut' => '2027-03-01',
            'date_fin' => '2027-03-05',
        ])->assertCreated()->json('data.uuid');

        // Refus sans motif refusé
        $this->api('PUT', "/v1/conges/{$conge}/traiter", ['statut' => 'refusee'])
            ->assertStatus(409)->assertJsonPath('error.code', 'MOTIF_OBLIGATOIRE');

        // Refus avec motif
        $this->api('PUT', "/v1/conges/{$conge}/traiter", ['statut' => 'refusee', 'commentaire' => 'Effectif insuffisant'])
            ->assertOk()->assertJsonPath('data.statut', 'refusee');

        // Aucune transition après un refus
        $this->api('PUT', "/v1/conges/{$conge}/traiter", ['statut' => 'approuvee', 'commentaire' => 'ok'])
            ->assertStatus(409)->assertJsonPath('error.code', 'TRANSITION_INTERDITE');

        // Approbation d'une autre demande, puis annulation possible
        $autre = $this->api('POST', '/v1/conges', [
            'personnel_uuid' => $p,
            'type_conge' => 'maladie',
            'date_debut' => '2027-06-07',
            'date_fin' => '2027-06-11',
        ])->assertCreated()->json('data.uuid');

        $this->api('PUT', "/v1/conges/{$autre}/traiter", ['statut' => 'approuvee'])
            ->assertOk()->assertJsonPath('data.statut', 'approuvee');

        $this->api('PUT', "/v1/conges/{$autre}/traiter", ['statut' => 'annulee'])
            ->assertOk()->assertJsonPath('data.statut', 'annulee');
    }

    public function test_conge_chevauchement_refuse(): void
    {
        $p = $this->creerPersonnel();

        $this->api('POST', '/v1/conges', [
            'personnel_uuid' => $p,
            'type_conge' => 'annuel',
            'date_debut' => '2028-01-10',
            'date_fin' => '2028-01-20',
        ])->assertCreated();

        $this->api('POST', '/v1/conges', [
            'personnel_uuid' => $p,
            'type_conge' => 'annuel',
            'date_debut' => '2028-01-15',
            'date_fin' => '2028-01-25',
        ])->assertStatus(409)->assertJsonPath('error.code', 'CONGE_CHEVAUCHANT');
    }

    /** Contrat Évaluations (RhClient) : liste `data` de créneaux portant enseignant_uuid / matiere_uuid / classe_uuid / statut. */
    public function test_interne_affectations_conforme_contrat_evaluations(): void
    {
        $p = $this->creerPersonnel();
        $matiere = (string) Str::uuid();
        $classe = (string) Str::uuid();

        $this->api('POST', '/v1/affectations', [
            'personnel_uuid' => $p,
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
            'annee_scolaire' => '2026-2027',
        ])->assertCreated();

        $reponse = $this->interne('/v1/interne/affectations', [
            'tenant_id' => self::TENANT,
            'enseignant_uuid' => $p,
            'matiere_uuid' => $matiere,
            'classe_uuid' => $classe,
        ])->assertOk();

        $this->assertTrue(array_is_list($reponse->json('data')));
        $reponse->assertJsonPath('data.0.enseignant_uuid', $p)
            ->assertJsonPath('data.0.matiere_uuid', $matiere)
            ->assertJsonPath('data.0.classe_uuid', $classe)
            ->assertJsonPath('data.0.statut', 'actif');

        // Homogène avec la lecture `donnees` / `data` de RhClient::creneaux()
        $this->assertArrayHasKey('data', $reponse->json());
        $this->assertNull($reponse->json('donnees'));

        // Une matière qui n'est pas la sienne n'est pas exposée
        $this->interne('/v1/interne/affectations', [
            'tenant_id' => self::TENANT,
            'enseignant_uuid' => $p,
            'matiere_uuid' => (string) Str::uuid(),
            'classe_uuid' => $classe,
        ])->assertOk()->assertJsonPath('data', []);
    }

    /** Contrat Vie scolaire (RhClient) : `/interne/personnel` expose un identifiant numérique `id`. */
    public function test_interne_personnel_conforme_contrat_vie_scolaire(): void
    {
        $p = $this->creerPersonnel();

        $reponse = $this->interne('/v1/interne/personnel', [
            'tenant_id' => self::TENANT,
            'uuid' => $p,
        ])->assertOk();

        $this->assertIsInt($reponse->json('data.id'));
        $this->assertSame($p, $reponse->json('data.uuid'));
        $this->assertSame(self::TENANT, $reponse->json('data.tenant_id'));

        // Recherche par identifiant interne (personnelParId)
        $this->interne('/v1/interne/personnel', [
            'tenant_id' => self::TENANT,
            'id' => $reponse->json('data.id'),
        ])->assertOk()->assertJsonPath('data.uuid', $p);

        // Résolution à partir d'un compte Identité
        $compte = (string) Str::uuid();
        $this->creerPersonnel(['utilisateur_uuid' => $compte], 2);

        $this->interne('/v1/interne/personnel/utilisateur/'.$compte, ['tenant_id' => 2])
            ->assertOk()
            ->assertJsonPath('data.utilisateur_uuid', $compte);
    }
}
