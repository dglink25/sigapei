<?php

namespace Tests\Feature;

use App\Integrations\Captcha\CaptchaProvider;
use Illuminate\Support\Facades\Http;

/**
 * Regle n°3 (secret interne partage) et regle n°4 (CAPTCHA partage).
 */
class GardeFousPlateformeTest extends ApiTestCase
{
    public function test_endpoint_interne_refuse_un_appel_sans_secret(): void
    {
        // Aucun X-Internal-Secret et aucun contexte tenant : le secret est
        // verifie en premier, la reponse est donc 403 et non 401.
        $this->getJson('/v1/interne/alertes-absences')
            ->assertStatus(403);
    }

    public function test_endpoint_interne_refuse_un_secret_incorrect(): void
    {
        $this->withHeaders($this->headersInterne(secret: 'mauvais-secret'))
            ->getJson('/v1/interne/alertes-absences')
            ->assertStatus(403);
    }

    public function test_endpoint_interne_accepte_le_secret_partage(): void
    {
        $this->withHeaders($this->headersInterne())
            ->getJson('/v1/interne/alertes-absences')
            ->assertOk();
    }

    public function test_ecriture_refusee_sans_captcha_token(): void
    {
        $this->seedCours(1, '22222222-0000-0000-0000-000000000000');
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersTenant())
            ->postJson('/v1/presences', [
                'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'present'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Vérification CAPTCHA échouée.');

        $this->assertDatabaseCount('presences', 0);

        Http::assertNothingSent();
    }

    public function test_ecriture_refusee_si_le_score_est_insuffisant(): void
    {
        $this->corpsCaptcha = ['success' => true, 'score' => 0.1];

        $this->seedCours(1, '22222222-0000-0000-0000-000000000000');
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersEcriture())
            ->postJson('/v1/presences', [
                'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'present'],
                ],
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('presences', 0);
    }

    public function test_captcha_hcaptcha_utilise_le_champ_success(): void
    {
        config(['services.captcha.provider' => 'hcaptcha']);
        $this->corpsCaptcha = ['success' => true];

        $this->seedCours(1, '22222222-0000-0000-0000-000000000000');
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersEcriture())
            ->postJson('/v1/presences', [
                'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'present'],
                ],
            ])
            ->assertCreated();

        $this->assertDatabaseCount('presences', 1);
    }

    public function test_captcha_est_indisponible_renvoie_503_et_n_ecrit_rien(): void
    {
        $this->statutCaptcha = 500;

        $this->seedCours(1, '22222222-0000-0000-0000-000000000000');
        $this->seedApprenant(1, '33333333-0000-0000-0000-000000000000');

        $this->withHeaders($this->headersEcriture())
            ->postJson('/v1/presences', [
                'cours_uuid' => '22222222-0000-0000-0000-000000000000',
                'date' => now()->toDateString(),
                'apprenants' => [
                    ['uuid' => '33333333-0000-0000-0000-000000000000', 'statut' => 'present'],
                ],
            ])
            ->assertStatus(503);

        $this->assertDatabaseCount('presences', 0);
    }

    public function test_lecture_ne_demande_pas_de_captcha(): void
    {
        $this->withHeaders($this->headersTenant())
            ->getJson('/v1/presences')
            ->assertOk();

        Http::assertNothingSent();
    }

    public function test_provider_captcha_exige_une_cle_secrete_configuree(): void
    {
        config(['services.captcha.secret' => '']);

        $this->expectException(\RuntimeException::class);

        app(CaptchaProvider::class)->verifie('un-token');
    }
}
