<?php

namespace Tests\Feature;

use App\Common\AuditLogger;
use App\Events\AbsenceDeclaree;
use App\Events\AlerteAbsencesDeclenchee;
use App\Models\Presence;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Event;

class EndpointsPresencesTest extends ApiTestCase
{
    use WithFaker;

    public function test_enregistrement_dun_cours_avec_absent_declenche_notification(): void
    {
        Event::fake([AbsenceDeclaree::class, AlerteAbsencesDeclenchee::class]);

        $classeId = $this->seedClasse(1, '11111111-0000-0000-0000-00000000000a');
        $coursId = $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $apprenant1 = $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);
        $apprenant2 = $this->seedApprenant(1, '33333333-0000-0000-0000-000000000001', $classeId);

        $reponse = $this->withHeaders($this->headersTenant())
            ->postJson('/v1/presences', [
                'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'present'],
                    ['uuid' => '33333333-0000-0000-0000-000000000001', 'statut' => 'absent'],
                ],
            ]);

        $reponse->assertStatus(201)
            ->assertJsonCount(2, 'presences')
            ->assertJsonMissing(['presences.0.id'])
            ->assertJsonPath('presences.0.uuid', fn ($uuid) => is_string($uuid));

        $this->assertDatabaseHas('presences', [
            'tenant_id' => 1,
            'apprenant_id' => $apprenant1,
            'statut' => 'present',
        ]);
        $this->assertDatabaseHas('presences', [
            'tenant_id' => 1,
            'apprenant_id' => $apprenant2,
            'statut' => 'absent',
        ]);

        Event::assertDispatched(AbsenceDeclaree::class, fn ($event) => $event->apprenantId === $apprenant2);
        Event::assertNotDispatched(AlerteAbsencesDeclenchee::class);
    }

    public function test_deux_absences_sur_la_periode_declenchent_alerte_au_seuil(): void
    {
        Event::fake([AbsenceDeclaree::class, AlerteAbsencesDeclenchee::class]);

        $classeId = $this->seedClasse();
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $apprenant = $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);

        for ($i = 0; $i < 2; $i++) {
            $this->withHeaders($this->headersTenant())
                ->postJson('/v1/presences', [
                    'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                    'date' => now()->subDays(1 + $i)->toDateString(),
                    'apprenants' => [
                        ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'absent'],
                    ],
                ])
                ->assertStatus(201);
        }

        Event::assertDispatched(AlerteAbsencesDeclenchee::class, fn ($event) => $event->apprenantId === $apprenant);
    }

    public function test_cours_introuvable_refuse_lenregistrement(): void
    {
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/presences', [
                'cours_uuid' => '99999999-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'absent'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Cours introuvable'));

        $this->assertDatabaseCount('presences', 0);
    }

    public function test_apprenant_introuvable_refuse_lenregistrement_sans_ecriture_partielle(): void
    {
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000');
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/presences', [
                'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'present'],
                    ['uuid' => '99999999-0000-0000-0000-000000000001', 'statut' => 'absent'],
                ],
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('presences', 0);
    }

    public function test_payload_invalide_est_refuse(): void
    {
        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/presences', [
                'cours_uuid' => 'pas-un-uuid',
                'date' => 'hier',
                'apprenants' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cours_uuid', 'date', 'apprenants']);
    }

    public function test_liste_est_filtrable_par_apprenant_et_periode(): void
    {
        $classeId = $this->seedClasse();
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $apprenant = $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);

        Presence::create([
            'tenant_id' => 1,
            'apprenant_id' => $apprenant,
            'cours_id' => 1,
            'statut' => 'absent',
            'date' => now()->subDays(2),
        ]);
        Presence::create([
            'tenant_id' => 1,
            'apprenant_id' => $apprenant,
            'cours_id' => 1,
            'statut' => 'present',
            'date' => now()->subDays(1),
        ]);

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/presences?apprenant_uuid=33333333-0000-0000-0000-000000000000&statut=absent')
            ->assertOk()
            ->assertJsonCount(1, 'presences')
            ->assertJsonPath('presences.0.statut', 'absent')
            ->assertJsonPath('presences.0.apprenant_uuid', '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/presences?classe_uuid=11111111-0000-0000-0000-000000000001&date_from='.now()->subDays(3)->toDateString().'&date_to='.now()->toDateString())
            ->assertOk()
            ->assertJsonCount(2, 'presences');
    }

    public function test_correction_du_jour_par_enseignant_est_journalisee(): void
    {
        $this->seedPersonnel(1, '55555555-0000-0000-0000-000000000000');
        $presence = $this->creerPresence(1, 'absent', today());

        $this->withHeaders($this->headersTenant())
            ->putJson("/v1/presences/{$presence->uuid}", [
                'statut' => 'present',
                'motif' => 'Erreur de saisie',
            ])
            ->assertOk()
            ->assertJsonPath('presence.statut', 'present');

        $this->assertDatabaseHas('presences', [
            'uuid' => $presence->uuid,
            'statut' => 'present',
            'motif_correction' => 'Erreur de saisie',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => 1,
            'action' => AuditLogger::ACTION_PRESENCE_CORRIGEE,
            'entite_uuid' => $presence->uuid,
        ]);
    }

    public function test_correction_hors_fenetre_par_enseignant_est_refusee(): void
    {
        $presence = $this->creerPresence(1, 'absent', today(), 50);

        $this->withHeaders($this->headersTenant())
            ->putJson("/v1/presences/{$presence->uuid}", [
                'statut' => 'present',
            ])
            ->assertStatus(403);
    }

    public function test_correction_hors_fenetre_par_censeur_est_acceptee(): void
    {
        $this->seedPersonnel(1, '55555555-0000-0000-0000-000000000001');
        $presence = $this->creerPresence(1, 'absent', today(), 50);

        $this->withHeaders($this->headersTenant(role: 'censeur', userUuid: '55555555-0000-0000-0000-000000000001'))
            ->putJson("/v1/presences/{$presence->uuid}", [
                'statut' => 'absent',
            ])
            ->assertOk();
    }

    public function test_synthese_absences_du_compte_les_absences_de_la_periode(): void
    {
        $classeId = $this->seedClasse();
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $apprenant = $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);

        Presence::create([
            'tenant_id' => 1, 'apprenant_id' => $apprenant, 'cours_id' => 1,
            'statut' => 'absent', 'date' => now()->subDays(2),
        ]);
        Presence::create([
            'tenant_id' => 1, 'apprenant_id' => $apprenant, 'cours_id' => 1,
            'statut' => 'absent', 'date' => now()->subDays(1),
        ]);

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/apprenants/33333333-0000-0000-0000-000000000000/absences/synthese')
            ->assertOk()
            ->assertJsonPath('synthese.total_absences', 2)
            ->assertJsonPath('synthese.total_presences', 0)
            ->assertJsonPath('synthese.seuil', 2)
            ->assertJsonPath('synthese.seuil_depasse', true);
    }

    public function test_isolement_tenant(): void
    {
        $classeId = $this->seedClasse(1, '11111111-0000-0000-0000-00000000000a');
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $apprenant = $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);

        $presence = Presence::create([
            'tenant_id' => 1,
            'apprenant_id' => $apprenant,
            'cours_id' => 1,
            'statut' => 'absent',
            'date' => today(),
        ]);

        $this->withHeaders($this->headersTenant(tenantId: 2))
            ->getJson('/v1/presences')
            ->assertOk()
            ->assertJsonCount(0, 'presences');

        $this->withHeaders($this->headersTenant(tenantId: 2))
            ->putJson("/v1/presences/{$presence->uuid}", ['statut' => 'present'])
            ->assertStatus(404);
    }
}
