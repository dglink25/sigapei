<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;

/** Tarifs, facturation, règlements saisis à la main, séparation des tâches, annulation, rapports. */
class ParcoursTest extends FinancesTestCase
{
    private string $admin;

    private string $comptable;

    private string $caissier;

    private string $caissierUuid;

    protected function setUp(): void
    {
        parent::setUp();
        [$this->admin] = $this->utilisateur('administrateur');
        [$this->comptable] = $this->utilisateur('comptable');
        [$this->caissier, $this->caissierUuid] = $this->utilisateur('caissier');
    }

    private function facture(?string $apprenant = null): array
    {
        $formule = $this->creerFormule($this->admin, ['code' => 'f-'.random_int(1000, 9999)])->assertCreated()->json('data.uuid');

        return $this->en($this->admin)->postJson('/v1/factures', ['apprenant_uuid' => $apprenant ?? $this->apprenant(), 'annee_scolaire' => '2026-2027', 'formules' => [$formule]])
            ->assertCreated()->json('data');
    }

    public function test_formule_valide_son_echeancier_et_son_code(): void
    {
        $this->creerFormule($this->admin, ['montant' => 120000])->assertStatus(422)->assertJsonPath('error.code', 'DONNEES_INVALIDES');
        $this->creerFormule($this->admin, ['annee_scolaire' => '2026-2028'])->assertStatus(422);
        $this->creerFormule($this->admin)->assertCreated()->assertJsonPath('data.montant', 150000);
        $this->creerFormule($this->admin)->assertStatus(409)->assertJsonPath('error.code', 'CODE_DEJA_UTILISE');
        $this->creerFormule($this->comptable, ['code' => 'autre'])->assertStatus(403);
    }

    public function test_emission_individuelle_puis_par_classe_sans_doublon(): void
    {
        $formule = $this->creerFormule($this->admin)->json('data.uuid');
        $a1 = $this->apprenant();
        $this->apprenant();
        $this->apprenant(['statut' => 'radie']);

        $f = $this->en($this->admin)->postJson('/v1/factures', ['apprenant_uuid' => $a1, 'annee_scolaire' => '2026-2027', 'formules' => [$formule]])
            ->assertCreated()->assertJsonPath('data.montant_total', 150000)->assertJsonPath('data.reste_a_payer', 150000)
            ->assertJsonCount(2, 'data.echeances')->json('data');
        $this->assertMatchesRegularExpression('/^FA-\d{4}-000001$/', $f['numero']);

        $this->en($this->admin)->postJson('/v1/factures', ['apprenant_uuid' => $a1, 'annee_scolaire' => '2026-2027', 'formules' => [$formule]])
            ->assertStatus(409)->assertJsonPath('error.code', 'DEJA_FACTURE');

        $lot = ['classe_uuid' => $this->classe, 'annee_scolaire' => '2026-2027', 'formules' => [$formule]];
        $this->en($this->admin)->postJson('/v1/factures/classe', $lot)->assertCreated()->assertJsonCount(1, 'data.creees')->assertJsonCount(1, 'data.ignorees');
        $this->en($this->admin)->postJson('/v1/factures/classe', $lot)->assertOk()->assertJsonCount(0, 'data.creees');

        $this->en($this->admin)->getJson('/v1/factures?tri=nom&statut=ouvertes')->assertOk()->assertJsonPath('data.pagination.total', 2);
        $this->en($this->admin)->getJson('/v1/factures?en_retard=1')->assertOk()->assertJsonPath('data.pagination.total', 2);
        $this->en($this->admin)->getJson('/v1/factures?recherche=MAT0')->assertOk()->assertJsonPath('data.pagination.total', 1);
    }

    public function test_apprenants_d_une_classe_pour_l_emission(): void
    {
        $this->apprenant(['nom' => 'ZINSOU']);
        $this->apprenant(['nom' => 'ADJOVI']);
        $this->apprenant(['nom' => 'BIO', 'statut' => 'radie']);

        $this->en($this->admin)->getJson("/v1/classes/{$this->classe}/apprenants")->assertOk()
            ->assertJsonCount(2, 'data')->assertJsonPath('data.0.nom', 'ADJOVI');
        $this->en($this->caissier)->getJson("/v1/classes/{$this->classe}/apprenants")->assertStatus(403);
    }

    public function test_grille_des_roles_et_separation_des_taches(): void
    {
        $f = $this->facture();
        $this->en($this->caissier)->postJson("/v1/factures/{$f['uuid']}/reglements", [])->assertStatus(403);

        $this->en($this->comptable)->putJson('/v1/gouvernance/caissier', ['actions' => ['saisir_reglement']])->assertStatus(403);
        $this->en($this->admin)->putJson('/v1/gouvernance/administrateur', ['actions' => []])->assertStatus(422);
        $this->en($this->admin)->putJson('/v1/gouvernance/caissier', ['actions' => ['saisir_reglement', 'valider_reglement', 'consulter_finances']])->assertOk();
        $this->en($this->admin)->putJson('/v1/gouvernance/comptable', ['actions' => ['valider_reglement', 'consulter_finances']])->assertOk();
        $this->en($this->caissier)->getJson('/v1/mes-droits')->assertJsonPath('data.actions', ['consulter_finances', 'saisir_reglement', 'valider_reglement']);

        $saisie = ['mode' => 'especes', 'montant' => 60000, 'date_reglement' => now()->toDateString(), 'piece_reference' => 'BORD-001'];
        $this->en($this->caissier)->postJson("/v1/factures/{$f['uuid']}/reglements", ['montant' => 200000] + $saisie)->assertStatus(422);
        $this->en($this->caissier)->postJson("/v1/factures/{$f['uuid']}/reglements", ['date_reglement' => now()->addDay()->toDateString()] + $saisie)->assertStatus(422);
        $r = $this->en($this->caissier)->postJson("/v1/factures/{$f['uuid']}/reglements", $saisie)
            ->assertCreated()->assertJsonPath('data.statut', 'a_valider')->assertJsonPath('data.recu_disponible', false)->json('data.uuid');

        // En attente de validation : déduit du disponible.
        $this->en($this->caissier)->postJson("/v1/factures/{$f['uuid']}/reglements", ['montant' => 100000] + $saisie)->assertStatus(422);
        $this->en($this->caissier)->getJson("/v1/reglements/{$r}/recu")->assertStatus(409);

        $this->en($this->caissier)->postJson("/v1/reglements/{$r}/valider")->assertStatus(403)->assertJsonPath('error.code', 'SEPARATION_DES_TACHES');
        $this->en($this->comptable)->postJson("/v1/reglements/{$r}/valider")->assertOk()->assertJsonPath('data.statut', 'valide')
            ->assertJsonPath('data.facture.reste_a_payer', 90000);
        $this->en($this->comptable)->postJson("/v1/reglements/{$r}/valider")->assertStatus(409);

        $this->en($this->admin)->getJson("/v1/factures/{$f['uuid']}")->assertJsonPath('data.statut', 'partiellement_reglee')->assertJsonPath('data.montant_regle', 60000);
        $url = $this->en($this->caissier)->getJson("/v1/reglements/{$r}/recu")->assertOk()->json('data.url');
        $this->flushHeaders();
        $this->assertStringStartsWith('%PDF', $this->get($url)->assertOk()->getContent());

        // Un règlement validé est figé en base.
        $this->expectExceptionMessageMatches('/fig|modifi/i');
        DB::table('finances.reglements')->where('uuid', $r)->update(['montant' => 1]);
    }

    public function test_rejet_et_file_de_validation(): void
    {
        $f = $this->facture();
        $this->en($this->admin)->putJson('/v1/gouvernance/caissier', ['actions' => ['saisir_reglement']])->assertOk();
        $saisie = ['mode' => 'cheque', 'montant' => 50000, 'date_reglement' => now()->toDateString(), 'piece_reference' => 'CHQ 778'];
        $r = $this->en($this->caissier)->postJson("/v1/factures/{$f['uuid']}/reglements", $saisie)->json('data.uuid');

        $this->en($this->admin)->getJson('/v1/reglements?statut=a_valider')->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.elements.0.facture.numero', $f['numero']);
        $this->en($this->admin)->postJson("/v1/reglements/{$r}/rejeter", ['motif' => 'court'])->assertStatus(422);
        $this->en($this->admin)->postJson("/v1/reglements/{$r}/rejeter", ['motif' => 'Chèque sans provision signalé par la banque.'])
            ->assertOk()->assertJsonPath('data.statut', 'rejete');
        $this->en($this->admin)->getJson("/v1/factures/{$f['uuid']}")->assertJsonPath('data.montant_regle', 0)->assertJsonPath('data.statut', 'emise');
    }

    public function test_separation_desactivee_valide_a_la_saisie_et_reste_tracee(): void
    {
        $f = $this->facture();
        $this->en($this->comptable)->putJson('/v1/parametres', ['double_validation_reglements' => false])->assertStatus(403);
        $this->en($this->admin)->putJson('/v1/parametres', ['double_validation_reglements' => false, 'relance_jours_apres' => [15, 1, 1]])
            ->assertStatus(422);
        $this->en($this->admin)->putJson('/v1/parametres', ['double_validation_reglements' => false, 'relance_jours_apres' => [15, 1]])
            ->assertOk()->assertJsonPath('data.relance_jours_apres', [1, 15]);

        $this->en($this->admin)->postJson("/v1/factures/{$f['uuid']}/reglements", ['mode' => 'virement', 'montant' => 150000, 'date_reglement' => now()->toDateString(), 'piece_reference' => 'VIR-99'])
            ->assertCreated()->assertJsonPath('data.statut', 'valide')->assertJsonPath('data.auto_valide', true);
        $this->en($this->admin)->getJson("/v1/factures/{$f['uuid']}")->assertJsonPath('data.statut', 'reglee');

        $this->en($this->admin)->getJson('/v1/journal?action=parametres.modifies')->assertOk()->assertJsonPath('data.pagination.total', 1);
        $this->en($this->admin)->putJson('/v1/parametres', ['devise' => 'XAF'])->assertStatus(409)->assertJsonPath('error.code', 'DEVISE_FIGEE');
    }

    public function test_annulation(): void
    {
        $f = $this->facture();
        $this->en($this->admin)->postJson("/v1/factures/{$f['uuid']}/annuler", ['motif' => 'Erreur de classe à la saisie.'])->assertOk()->assertJsonPath('data.statut', 'annulee');
        $this->en($this->admin)->postJson("/v1/factures/{$f['uuid']}/annuler", ['motif' => 'Erreur de classe à la saisie.'])->assertStatus(409);

        $g = $this->facture();
        $this->en($this->admin)->putJson('/v1/parametres', ['double_validation_reglements' => false])->assertOk();
        $this->en($this->admin)->postJson("/v1/factures/{$g['uuid']}/reglements", ['mode' => 'especes', 'montant' => 1000, 'date_reglement' => now()->toDateString(), 'piece_reference' => 'B-1'])->assertCreated();
        $this->en($this->admin)->postJson("/v1/factures/{$g['uuid']}/annuler", ['motif' => 'Erreur de classe à la saisie.'])->assertStatus(409)->assertJsonPath('error.code', 'FACTURE_REGLEE');
    }

    public function test_lignes_et_echeances_immuables_en_base(): void
    {
        $this->facture();
        $this->expectExceptionMessageMatches('/fig|modifi|immuable/i');
        DB::table('finances.facture_lignes')->update(['montant' => 1]);
    }

    public function test_rapport_et_solde(): void
    {
        $a = $this->apprenant();
        $f = $this->facture($a);
        $this->en($this->admin)->putJson('/v1/parametres', ['double_validation_reglements' => false])->assertOk();
        $this->en($this->admin)->postJson("/v1/factures/{$f['uuid']}/reglements", ['mode' => 'especes', 'montant' => 40000, 'date_reglement' => now()->toDateString(), 'piece_reference' => 'B-2'])->assertCreated();

        $this->en($this->admin)->getJson("/v1/apprenants/{$a}/solde")->assertOk()
            ->assertJsonPath('data.reste_a_payer', 110000)->assertJsonPath('data.montant_echu_impaye', 60000)->assertJsonPath('data.a_jour', false);
        $this->en($this->admin)->getJson('/v1/rapports/synthese')->assertOk()
            ->assertJsonPath('data.encaisse.total', 40000)->assertJsonPath('data.situation.apprenants_en_retard', 1);
        $this->en($this->admin)->getJson('/v1/rapports/synthese?du=2025-01-01&au=2026-12-31')->assertStatus(422);
        $this->en($this->comptable)->getJson('/v1/rapports/synthese')->assertStatus(403);
    }

    public function test_relances_une_seule_fois_par_palier(): void
    {
        $this->facture();
        $this->assertSame(0, $this->artisan('finances:relances'));
        $this->assertSame(0, $this->artisan('finances:relances'));

        $this->assertSame(1, DB::table('finances.relances')->count());
        $this->assertSame(1, (int) DB::table('finances.relances')->value('palier'));
    }
}
