<?php

namespace Tests\Feature;

use App\Common\AuditLogger;
use App\Models\IncidentDisciplinaire;

class EndpointsIncidentsTest extends ApiTestCase
{
    public function test_signalement_dun_incident_sans_sanction(): void
    {
        $classeId = $this->seedClasse();
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);
        $this->seedPersonnel(1, '55555555-0000-0000-0000-000000000000');

        $reponse = $this->withHeaders($this->headersTenant())
            ->postJson('/v1/incidents', [
                'apprenant_uuid' => '33333333-0000-0000-0000-000000000000',
                'type' => 'retard',
                'description' => 'Retard répété au premier cours.',
            ]);

        $reponse->assertCreated()
            ->assertJsonPath('incident.type', 'retard')
            ->assertJsonPath('incident.sanction', null)
            ->assertJsonPath('incident.apprenant_uuid', '33333333-0000-0000-0000-000000000000')
            ->assertJsonMissing(['incident.id']);

        $incident = IncidentDisciplinaire::firstOrFail();

        $this->assertDatabaseHas('incidents_disciplinaires', [
            'uuid' => $incident->uuid,
            'tenant_id' => 1,
            'auteur_id' => 1,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => 1,
            'action' => AuditLogger::ACTION_INCIDENT_AJOUTE,
            'entite_uuid' => $incident->uuid,
        ]);
    }

    public function test_apprenant_introuvable_refuse_le_signalement(): void
    {
        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/incidents', [
                'apprenant_uuid' => '99999999-0000-0000-0000-000000000001',
                'type' => 'comportement',
                'description' => 'Test',
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('incidents_disciplinaires', 0);
    }

    public function test_type_invalide_est_refuse(): void
    {
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/incidents', [
                'apprenant_uuid' => '33333333-0000-0000-0000-000000000000',
                'type' => 'pire_comportement',
                'description' => 'Test',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_sanction_sur_incident_existant_est_journalisee(): void
    {
        $classeId = $this->seedClasse();
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);
        $this->seedPersonnel(1, '55555555-0000-0000-0000-000000000000');

        $incident = IncidentDisciplinaire::create([
            'tenant_id' => 1,
            'apprenant_id' => 1,
            'auteur_id' => 1,
            'type' => 'comportement',
            'description' => 'Incident initial',
        ]);

        $this->withHeaders($this->headersTenant())
            ->postJson("/v1/incidents/{$incident->uuid}/sanction", [
                'sanction' => 'Heure de colle',
            ])
            ->assertOk()
            ->assertJsonPath('incident.sanction', 'Heure de colle');

        $this->assertNotNull($incident->fresh()->sanction_appliquee_le);
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => 1,
            'action' => AuditLogger::ACTION_SANCTION_APPLIQUEE,
            'entite_uuid' => $incident->uuid,
        ]);
    }

    public function test_sanction_sur_incident_inexistant_est_refusee(): void
    {
        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/incidents/99999999-0000-0000-0000-000000000002/sanction', [
                'sanction' => 'Heure de colle',
            ])
            ->assertStatus(404);
    }

    public function test_liste_incidents_filtrable_par_apprenant(): void
    {
        $classeId = $this->seedClasse();
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000001', $classeId);

        IncidentDisciplinaire::create([
            'tenant_id' => 1, 'apprenant_id' => 1, 'auteur_id' => 1,
            'type' => 'retard', 'description' => 'Incident A',
        ]);
        IncidentDisciplinaire::create([
            'tenant_id' => 1, 'apprenant_id' => 2, 'auteur_id' => 1,
            'type' => 'comportement', 'description' => 'Incident B',
        ]);

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/incidents?apprenant_uuid=33333333-0000-0000-0000-000000000000')
            ->assertOk()
            ->assertJsonCount(1, 'incidents')
            ->assertJsonPath('incidents.0.description', 'Incident A');
    }

    public function test_incident_est_filtre_par_tenant(): void
    {
        $classeId = $this->seedClasse(2, '11111111-0000-0000-0000-000000000002');
        $this->seedApprenant(2, '33333333-0000-0000-0000-000000000002', $classeId);

        IncidentDisciplinaire::create([
            'tenant_id' => 2, 'apprenant_id' => 1, 'auteur_id' => 1,
            'type' => 'retard', 'description' => 'Incident autre tenant',
        ]);

        $this->withHeaders($this->headersTenant(tenantId: 1))
            ->getJson('/v1/incidents')
            ->assertOk()
            ->assertJsonCount(0, 'incidents');
    }
}
