<?php

namespace Tests\Feature;

use App\Models\IncidentDisciplinaire;
use App\Models\Presence;

class EndpointsAlertesDossierTest extends ApiTestCase
{
    public function test_alertes_absences_liste_les_apprenants_au_dela_du_seuil(): void
    {
        $classeId = $this->seedClasse();
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000001', $classeId);

        foreach ([1, 2, 3] as $jour) {
            Presence::create([
                'tenant_id' => 1, 'apprenant_id' => 1, 'cours_id' => 1,
                'statut' => 'absent', 'date' => now()->subDays($jour),
            ]);
            Presence::create([
                'tenant_id' => 1, 'apprenant_id' => 2, 'cours_id' => 1,
                'statut' => 'absent', 'date' => now()->subDays($jour),
            ]);
        }

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/interne/alertes-absences')
            ->assertOk()
            ->assertJsonCount(2, 'alertes')
            ->assertJsonPath('alertes.0.total_absences', 3)
            ->assertJsonPath('alertes.0.seuil', 2)
            ->assertJsonPath('alertes.0.periode_jours', 30)
            ->assertJsonPath('alertes.0.apprenant_uuid', fn ($uuid) => in_array($uuid, ['33333333-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000001'], true));
    }

    public function test_absences_anciennes_hors_periode_ne_déclenchent_pas_dalerte(): void
    {
        $this->seedCours();
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        for ($i = 0; $i < 5; $i++) {
            Presence::create([
                'tenant_id' => 1, 'apprenant_id' => 1, 'cours_id' => 1,
                'statut' => 'absent', 'date' => now()->subDays(60 + $i),
            ]);
        }

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/interne/alertes-absences')
            ->assertOk()
            ->assertJsonCount(0, 'alertes');
    }

    public function test_dossier_vie_scolaire_consolide_presences_et_incidents(): void
    {
        $classeId = $this->seedClasse();
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000', $classeId);
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000', $classeId);

        Presence::create([
            'tenant_id' => 1, 'apprenant_id' => 1, 'cours_id' => 1,
            'statut' => 'absent', 'date' => now()->subDays(1),
        ]);
        IncidentDisciplinaire::create([
            'tenant_id' => 1, 'apprenant_id' => 1, 'auteur_id' => 1,
            'type' => 'retard', 'description' => 'Retard',
        ]);

        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/apprenants/33333333-0000-0000-0000-000000000000/dossier-vie-scolaire')
            ->assertOk()
            ->assertJsonPath('dossier.apprenant_uuid', '33333333-0000-0000-0000-000000000000')
            ->assertJsonPath('dossier.synthese_absences.total_absences', 1)
            ->assertJsonCount(1, 'dossier.presences_recentes')
            ->assertJsonCount(1, 'dossier.incidents');
    }

    public function test_apprenant_introuvable_pour_dossier_renvoie_404(): void
    {
        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/apprenants/99999999-0000-0000-0000-000000000001/dossier-vie-scolaire')
            ->assertStatus(404);
    }
}
