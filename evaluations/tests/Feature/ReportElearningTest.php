<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

/** Report des notes E-learning : POST /v1/interne/notes-elearning (secret partagé + X-Tenant-Id). */
class ReportElearningTest extends ApiTestCase
{
    private array $c;

    private string $alice;

    private string $quiz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->c = $this->configurer();
        $this->alice = $this->ajouterApprenant(champs: ['utilisateur_uuid' => $this->eleveUser]);
        $this->affecter($this->prof, $this->c['maths']);
        $this->quiz = (string) Str::uuid();
    }

    private function reporter(array $champs = [], ?string $secret = 'secret-de-test-interne-0123456789abcdef', string $tenant = '1'): TestResponse
    {
        $this->flushHeaders();

        return $this->postJson('/v1/interne/notes-elearning', array_merge([
            'source' => 'quiz',
            'source_uuid' => (string) Str::uuid(),
            'activite_uuid' => $this->quiz,
            'activite_libelle' => 'Fractions',
            'apprenant_uuid' => $this->alice,
            'matiere_uuid' => $this->c['maths'],
            'enseignant_uuid' => $this->prof,
            'valeur' => '14',
            'note_sur' => '20',
            'date' => '2026-10-15',
        ], $champs), array_filter(['X-Internal-Secret' => $secret, 'X-Tenant-Id' => $tenant]));
    }

    public function test_report_cree_une_epreuve_par_activite_et_compte_dans_la_moyenne(): void
    {
        $r = $this->reporter()->assertCreated()
            ->assertJsonPath('data.valeur', '14.00')
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.periode_uuid', $this->c['periode']);

        $evaluation = DB::table('evaluations')->first();
        $this->assertSame('note_elearning', $evaluation->type);
        $this->assertSame('Quiz E-learning : Fractions', $evaluation->libelle);
        $this->assertSame($this->quiz, $evaluation->activite_elearning_uuid);
        $this->assertSame($r->json('data.evaluation_uuid'), $evaluation->uuid);

        $this->en('apprenant', $this->eleveUser)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")
            ->assertOk()->assertJsonPath('data.moyenne', '14.00');
    }

    public function test_meme_report_rejoue_ne_cree_pas_de_doublon(): void
    {
        $source = (string) Str::uuid();
        $note = $this->reporter(['source_uuid' => $source])->assertCreated()->json('data.note_uuid');

        $this->reporter(['source_uuid' => $source])->assertOk()
            ->assertJsonPath('data.note_uuid', $note)->assertJsonPath('data.version', 1);

        $this->assertSame(1, DB::table('evaluations')->count());
        $this->assertSame(1, DB::table('notes')->count());
        $this->assertSame(0, DB::table('audit_note')->count());
    }

    public function test_nouvelle_valeur_met_a_jour_avec_audit_tant_que_la_periode_est_ouverte(): void
    {
        $note = $this->reporter()->assertCreated()->json('data.note_uuid');
        $nouvelleTentative = (string) Str::uuid();

        $this->reporter(['valeur' => '17.5', 'source_uuid' => $nouvelleTentative])->assertOk()
            ->assertJsonPath('data.note_uuid', $note)
            ->assertJsonPath('data.valeur', '17.50')
            ->assertJsonPath('data.version', 2);

        $audit = DB::table('audit_note')->first();
        $this->assertSame('14.00', $audit->valeur_avant);
        $this->assertSame('17.50', $audit->valeur_apres);
        $this->assertSame($this->prof, $audit->auteur_uuid);
        $this->assertSame($nouvelleTentative, DB::table('notes')->value('source_elearning_uuid'));
    }

    public function test_bareme_de_l_activite_conserve_et_conversion_des_reports_suivants(): void
    {
        $this->reporter(['valeur' => '20', 'note_sur' => '25'])->assertCreated()
            ->assertJsonPath('data.note_sur', '25.00')->assertJsonPath('data.valeur', '20.00');

        // 16/20 ramené sur 25 = 20 : valeur identique, rien ne change.
        $this->reporter(['valeur' => '16', 'note_sur' => '20'])->assertOk()->assertJsonPath('data.version', 1);

        $this->en('apprenant', $this->eleveUser)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")
            ->assertOk()->assertJsonPath('data.moyenne', '16.00');
    }

    public function test_periode_cloturee_refuse_le_report(): void
    {
        $this->reporter()->assertCreated();
        $this->commeAdmin()->postJson("/v1/periodes/{$this->c['periode']}/cloturer")->assertStatus(202);

        $this->reporter(['valeur' => '19'])->assertStatus(409)->assertJsonPath('error.code', 'PERIODE_CLOTUREE');
        $this->reporter(['activite_uuid' => (string) Str::uuid()])->assertStatus(409)->assertJsonPath('error.code', 'PERIODE_CLOTUREE');
        $this->assertSame(1, DB::table('evaluations')->count());
    }

    public function test_date_hors_de_toute_periode(): void
    {
        $this->reporter(['date' => '2027-06-01'])->assertStatus(409)->assertJsonPath('error.code', 'PERIODE_INTROUVABLE');
    }

    public function test_garde_fous_d_acces(): void
    {
        $this->reporter(secret: null)->assertStatus(403);
        $this->reporter(secret: str_repeat('x', 40))->assertStatus(403);
        $this->reporter(['enseignant_uuid' => $this->autreProf])->assertStatus(403);
        $this->reporter(['apprenant_uuid' => (string) Str::uuid()])->assertStatus(422);
        $this->reporter(['matiere_uuid' => (string) Str::uuid()])->assertStatus(422);
        $this->reporter(tenant: '2')->assertStatus(422); // apprenant inconnu chez un autre tenant
        $this->reporter(['valeur' => '21'])->assertStatus(422);
        $this->reporter(['valeur' => '-1'])->assertStatus(422);
        $this->assertSame(0, DB::table('notes')->count());
    }

    public function test_activite_ne_change_pas_de_matiere(): void
    {
        $this->reporter()->assertCreated();
        $francais = $this->commeAdmin()->postJson('/v1/matieres', ['code' => 'FR', 'nom' => 'Français', 'coefficient_defaut' => '2'])->json('data.uuid');
        $this->affecter($this->prof, $francais);

        $this->reporter(['matiere_uuid' => $francais])->assertStatus(409)->assertJsonPath('error.code', 'ACTIVITE_INCOHERENTE');
    }
}
