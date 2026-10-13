<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Parcours complet : barème -> période -> évaluation -> saisie -> bulletin -> clôture -> correction.
 */
class ParcoursNotesBulletinsTest extends ApiTestCase
{
    private array $c;

    private string $alice;

    private string $bob;

    private string $carla;

    protected function setUp(): void
    {
        parent::setUp();
        $this->c = $this->configurer();
        $this->affecter($this->prof, $this->c['maths']);

        $this->alice = $this->ajouterApprenant(champs: ['nom' => 'ADJO', 'utilisateur_uuid' => $this->eleveUser]);
        $this->bob = $this->ajouterApprenant(champs: ['nom' => 'BIO', 'parents' => [['parent_uuid' => $this->parent, 'lien_parente' => 'pere']]]);
        $this->carla = $this->ajouterApprenant(champs: ['nom' => 'CAKPO']);
    }

    // ---------------------------------------------------------------- Barèmes

    public function test_echelle_de_mentions_avec_trou_refusee(): void
    {
        $this->commeAdmin()->putJson('/v1/parametres-notation/secondaire', [
            'grille_uuid' => $this->c['grille'],
            'echelle_appreciation' => [
                ['min' => '0', 'max' => '9.99', 'mention' => 'Insuffisant'],
                ['min' => '10', 'max' => '20', 'mention' => 'Admis'],
            ],
        ])->assertStatus(422)->assertJsonPath('error.code', 'DONNEES_INVALIDES');
    }

    public function test_bareme_d_un_autre_cycle_refuse(): void
    {
        $primaire = $this->commeAdmin()->getJson('/v1/grilles?cycle=primaire')->json('data.0.uuid');
        $this->commeAdmin()->putJson('/v1/parametres-notation/secondaire', [
            'grille_uuid' => $primaire,
            'echelle_appreciation' => [['min' => '0', 'max' => '20', 'mention' => 'X']],
        ])->assertStatus(422);
    }

    public function test_decimales_par_defaut_deux(): void
    {
        $this->commeAdmin()->getJson('/v1/parametres-notation/secondaire')->assertOk()
            ->assertJsonPath('data.decimales', 2)
            ->assertJsonPath('data.ponderation_types.interrogation.mode', 'bloc')
            ->assertJsonPath('data.ponderation_types.devoir_surveille.mode', 'individuel');
    }

    // ---------------------------------------------------------------- Évaluations

    public function test_enseignant_non_affecte_ne_peut_pas_creer_d_evaluation(): void
    {
        $this->commeProf($this->autreProf)->postJson('/v1/evaluations', [
            'periode_uuid' => $this->c['periode'], 'matiere_uuid' => $this->c['maths'], 'classe_uuid' => $this->classe,
            'type' => 'devoir_surveille', 'libelle' => 'Pirate', 'date_evaluation' => '2026-10-15',
        ])->assertStatus(403);
    }

    public function test_date_hors_periode_refusee(): void
    {
        $this->commeProf()->postJson('/v1/evaluations', [
            'periode_uuid' => $this->c['periode'], 'matiere_uuid' => $this->c['maths'], 'classe_uuid' => $this->classe,
            'type' => 'devoir_surveille', 'libelle' => 'Hors', 'date_evaluation' => '2027-01-15',
        ])->assertStatus(422);
    }

    // ---------------------------------------------------------------- Saisie

    public function test_saisie_controlee(): void
    {
        $ev = $this->creerEvaluation($this->c['periode'], $this->c['maths'], ['note_sur' => '10']);

        // Apprenant d'une autre classe
        $this->saisir($ev, [['apprenant_uuid' => (string) Str::uuid(), 'statut' => 'saisie', 'valeur' => '5']])->assertStatus(422);
        // Au-delà du barème de l'épreuve (sur 10)
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '12']])->assertStatus(422);
        // Note manquante pour un statut "saisie"
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie']])->assertStatus(422);
        // Un autre enseignant ne saisit pas sur l'évaluation d'un collègue
        $this->commeProf($this->autreProf)->postJson('/v1/notes', ['evaluation_uuid' => $ev, 'notes' => [
            ['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '5'],
        ]])->assertStatus(403);

        $this->saisir($ev, [
            ['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '8.5'],
            ['apprenant_uuid' => $this->bob, 'statut' => 'absent_justifie'],
        ])->assertOk()->assertJsonPath('data.0.valeur', '8.50')->assertJsonPath('data.0.version', 1);

        $this->assertSame(2, DB::table('notes')->count());
    }

    public function test_modification_avec_verrou_optimiste_et_audit(): void
    {
        $ev = $this->creerEvaluation($this->c['periode'], $this->c['maths']);
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '12']])->assertOk();

        // Sans version : refus (pas d'écrasement silencieux)
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '13']])->assertStatus(422);
        // Version périmée : conflit
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '13', 'version' => 7]])
            ->assertStatus(409)->assertJsonPath('error.code', 'NOTE_MODIFIEE_ENTRE_TEMPS');
        // Bonne version
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '13', 'version' => 1]])
            ->assertOk()->assertJsonPath('data.0.version', 2);

        $audit = DB::table('audit_note')->first();
        $this->assertSame('12.00', $audit->valeur_avant);
        $this->assertSame('13.00', $audit->valeur_apres);
        $this->assertSame($this->prof, $audit->auteur_uuid);
    }

    public function test_journal_d_audit_et_notes_proteges_par_la_base(): void
    {
        $ev = $this->creerEvaluation($this->c['periode'], $this->c['maths']);
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '12']]);
        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '14', 'version' => 1]]);

        foreach (['UPDATE audit_note SET motif = \'falsifié par SQL direct\'', 'DELETE FROM audit_note', 'DELETE FROM notes'] as $sql) {
            try {
                DB::transaction(fn () => DB::statement($sql));
                $this->fail("Requête acceptée à tort : {$sql}");
            } catch (QueryException $e) {
                $this->assertStringContainsString('immuable', $e->getMessage());
            }
        }
    }

    // ---------------------------------------------------------------- Bulletins

    public function test_bulletin_a_la_volee_et_droits_de_lecture(): void
    {
        $this->remplirNotes();

        // Alice (elle-même), le parent de Bob, l'enseignant affecté, l'administrateur : autorisés
        $this->en('apprenant', $this->eleveUser)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")
            ->assertOk()
            ->assertJsonPath('data.provisoire', true)
            ->assertJsonPath('data.moyenne', '15.33')   // (14 + 16×2) / 3
            ->assertJsonPath('data.rang', 1)
            ->assertJsonPath('data.mention', 'Bien')
            ->assertJsonPath('data.regles_appliquees.politique_note_manquante', 'Notes non saisies exclues du calcul');

        $this->en('parent', $this->parent)->getJson("/v1/bulletins/apprenant/{$this->bob}?periode_uuid={$this->c['periode']}")
            ->assertOk()->assertJsonPath('data.moyenne', '10.00');
        $this->commeProf()->getJson("/v1/bulletins/apprenant/{$this->bob}?periode_uuid={$this->c['periode']}")->assertOk();
        $this->commeAdmin()->getJson("/v1/bulletins/apprenant/{$this->bob}?periode_uuid={$this->c['periode']}")->assertOk();

        // Refusés : Alice sur le bulletin de Bob, le parent sur Alice, un enseignant non affecté
        $this->en('apprenant', $this->eleveUser)->getJson("/v1/bulletins/apprenant/{$this->bob}?periode_uuid={$this->c['periode']}")->assertStatus(403);
        $this->en('parent', $this->parent)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")->assertStatus(403);
        $this->commeProf($this->autreProf)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")->assertStatus(403);
    }

    public function test_classement_avec_ex_aequo(): void
    {
        $this->remplirNotes(carla: '10');

        $classement = $this->commeProf()->getJson("/v1/classements/classe/{$this->classe}?periode_uuid={$this->c['periode']}")
            ->assertOk()->json('data');

        $rangs = array_column($classement['apprenants'], 'rang', 'apprenant_uuid');
        $this->assertSame(1, $rangs[$this->alice]);
        $this->assertSame(2, $rangs[$this->bob]);
        $this->assertSame(2, $rangs[$this->carla]);
        $this->assertSame('11.78', $classement['moyenne_classe']); // (15.333 + 10 + 10) / 3
    }

    public function test_cloture_archive_puis_correction_cree_une_version(): void
    {
        $this->remplirNotes();

        $this->commeAdmin()->postJson("/v1/periodes/{$this->c['periode']}/cloturer")->assertStatus(202);
        $this->commeAdmin()->postJson("/v1/periodes/{$this->c['periode']}/cloturer")->assertStatus(409);

        $this->assertSame('cloturee', DB::table('periodes')->value('statut'));
        $this->assertSame(3, DB::table('bulletins')->count());

        // Saisie fermée après clôture
        $ev = DB::table('evaluations')->orderBy('id')->value('uuid');
        $this->saisir($ev, [['apprenant_uuid' => $this->carla, 'statut' => 'saisie', 'valeur' => '20']])
            ->assertStatus(409)->assertJsonPath('error.code', 'PERIODE_CLOTUREE');

        // Bulletin archivé
        $this->en('apprenant', $this->eleveUser)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")
            ->assertOk()->assertJsonPath('data.provisoire', false)->assertJsonPath('data.version', 1);

        // Correction administrative de la note de Bob (devoir 2 : 10 -> 20), motif obligatoire
        $note = DB::table('notes')->where('apprenant_uuid', $this->bob)->orderByDesc('id')->first();
        $this->commeAdmin()->putJson("/v1/notes/{$note->uuid}/corriger", ['statut' => 'saisie', 'valeur' => '20', 'version' => $note->version, 'motif' => 'court'])
            ->assertStatus(422);
        $this->commeAdmin()->putJson("/v1/notes/{$note->uuid}/corriger", [
            'statut' => 'saisie', 'valeur' => '20', 'version' => $note->version, 'motif' => 'Erreur de report constatée sur la copie',
        ])->assertOk();

        // Bob passe premier : son bulletin ET celui d'Alice (rang changé) ont une version 2 ; Carla aussi (moyenne de classe)
        $bulletinBob = $this->en('parent', $this->parent)->getJson("/v1/bulletins/apprenant/{$this->bob}?periode_uuid={$this->c['periode']}")
            ->assertOk()->json('data');
        $this->assertSame(2, $bulletinBob['version']);
        $this->assertSame('16.67', $bulletinBob['moyenne']); // (10 + 20×2) / 3
        $this->assertSame(1, $bulletinBob['rang']);
        $this->assertCount(2, $bulletinBob['versions']);
        $this->assertSame(2, DB::table('bulletins')->where('apprenant_uuid', $this->alice)->max('version'));

        $audit = DB::table('audit_note')->where('apres_cloture', true)->first();
        $this->assertSame('Erreur de report constatée sur la copie', $audit->motif);

        // Un bulletin archivé ne se réécrit pas, même en SQL direct
        $this->expectException(QueryException::class);
        DB::statement('UPDATE bulletins SET moyenne = 20');
    }

    public function test_eligibilite_document_apres_cloture(): void
    {
        $this->remplirNotes();
        $this->commeAdmin()->postJson("/v1/periodes/{$this->c['periode']}/cloturer")->assertStatus(202);

        $this->flushHeaders();
        $this->getJson("/v1/interne/eligibilite-document/{$this->alice}", ['X-Tenant-Id' => '1', 'X-Internal-Secret' => 'secret-de-test-interne-0123456789abcdef'])
            ->assertOk()->assertJsonPath('data.eligible', true)->assertJsonPath('data.bulletins.0.version', 1);
        // Un autre établissement ne voit rien
        $this->getJson("/v1/interne/eligibilite-document/{$this->alice}", ['X-Tenant-Id' => '2', 'X-Internal-Secret' => 'secret-de-test-interne-0123456789abcdef'])
            ->assertOk()->assertJsonPath('data.eligible', false);
    }

    public function test_contrat_scolarite_incomplet_refuse_par_defaut(): void
    {
        $ev = $this->creerEvaluation($this->c['periode'], $this->c['maths']);
        $this->contratComplet = false;

        $this->saisir($ev, [['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '12']])
            ->assertStatus(503)->assertJsonPath('error.code', 'SERVICE_DEPENDANT_INDISPONIBLE');
        $this->en('apprenant', $this->eleveUser)->getJson("/v1/bulletins/apprenant/{$this->alice}?periode_uuid={$this->c['periode']}")
            ->assertStatus(503);
    }

    // ---------------------------------------------------------------- Contestations

    public function test_contestation(): void
    {
        $this->remplirNotes();
        $note = DB::table('notes')->where('apprenant_uuid', $this->alice)->value('uuid');

        $this->en('parent', $this->parent)->postJson('/v1/contestations', ['note_uuid' => $note, 'motif' => 'Ce n\'est pas mon enfant'])->assertStatus(403);

        $contestation = $this->en('apprenant', $this->eleveUser)->postJson('/v1/contestations', ['note_uuid' => $note, 'motif' => 'Une question a été oubliée au barème'])
            ->assertCreated()->json('data.uuid');
        $this->en('apprenant', $this->eleveUser)->postJson('/v1/contestations', ['note_uuid' => $note, 'motif' => 'Une question a été oubliée au barème'])
            ->assertStatus(409);

        $this->commeProf($this->autreProf)->putJson("/v1/contestations/{$contestation}/traiter", ['statut' => 'en_examen'])->assertStatus(403);
        $this->commeProf()->getJson('/v1/contestations')->assertOk()->assertJsonCount(1, 'data');
        $this->commeProf()->putJson("/v1/contestations/{$contestation}/traiter", ['statut' => 'resolue'])->assertStatus(409);
        $this->commeProf()->putJson("/v1/contestations/{$contestation}/traiter", ['statut' => 'resolue', 'reponse' => 'Barème revu, note corrigée par l\'administration'])
            ->assertOk()->assertJsonPath('data.statut', 'resolue');
    }

    // ---------------------------------------------------------------- Outils

    /** Devoir 1 (coef 1) et devoir 2 (coef 2) : Alice 14/16, Bob 10/10, Carla absente non justifiée ou note fournie. */
    private function remplirNotes(?string $carla = null): void
    {
        $d1 = $this->creerEvaluation($this->c['periode'], $this->c['maths']);
        $d2 = $this->creerEvaluation($this->c['periode'], $this->c['maths'], ['libelle' => 'Devoir 2', 'coefficient' => '2', 'date_evaluation' => '2026-11-10']);

        $carlaNote = $carla === null ? ['statut' => 'absent_non_justifie'] : ['statut' => 'saisie', 'valeur' => $carla];

        $this->saisir($d1, [
            ['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '14'],
            ['apprenant_uuid' => $this->bob, 'statut' => 'saisie', 'valeur' => '10'],
            ['apprenant_uuid' => $this->carla] + $carlaNote,
        ])->assertOk();
        $this->saisir($d2, [
            ['apprenant_uuid' => $this->alice, 'statut' => 'saisie', 'valeur' => '16'],
            ['apprenant_uuid' => $this->bob, 'statut' => 'saisie', 'valeur' => '10'],
            ['apprenant_uuid' => $this->carla] + $carlaNote,
        ])->assertOk();
    }
}
