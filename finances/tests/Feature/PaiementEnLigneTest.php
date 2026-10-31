<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

/** Paiement en ligne : Finances consomme le microservice Paiement, ne croit jamais une notification. */
class PaiementEnLigneTest extends FinancesTestCase
{
    private string $admin;

    private string $parent;

    private string $parentUuid;

    private string $enfant;

    private array $facture;

    protected function setUp(): void
    {
        parent::setUp();
        [$this->admin] = $this->utilisateur('administrateur');
        [$this->parent, $this->parentUuid] = $this->utilisateur('parent');
        $this->enfant = $this->apprenant(['parents' => [['parent_uuid' => $this->parentUuid, 'lien' => 'pere']]]);
        $formule = $this->creerFormule($this->admin)->json('data.uuid');
        $this->facture = $this->en($this->admin)->postJson('/v1/factures', ['apprenant_uuid' => $this->enfant, 'annee_scolaire' => '2026-2027', 'formules' => [$formule]])->json('data');
    }

    private function payer(int $montant = 100000): array
    {
        return $this->en($this->parent)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => $montant, 'url_retour' => 'https://app.sigapei.test/finances'])
            ->assertCreated()->json('data');
    }

    private function notifier(string $encaissement): TestResponse
    {
        return $this->interne()->postJson('/v1/interne/paiements/notification', ['encaissement_uuid' => $encaissement]);
    }

    public function test_la_famille_voit_ses_factures_et_paie_en_ligne(): void
    {
        $this->en($this->parent)->getJson('/v1/mes-finances')->assertOk()
            ->assertJsonPath('data.0.apprenant.uuid', $this->enfant)
            ->assertJsonPath('data.0.solde.reste_a_payer', 150000)
            ->assertJsonPath('data.0.factures.0.numero', $this->facture['numero']);

        $p = $this->payer();
        $this->assertStringStartsWith('https://checkout.agregateur.test/', $p['url_paiement']);
        $this->assertSame('en_attente', $p['statut']);
        $this->assertSame($p['uuid'], $this->demandesPaiement[0]['cle']);
        $this->assertSame('facture', $this->demandesPaiement[0]['objet_type']);
        $this->assertSame($this->facture['uuid'], $this->demandesPaiement[0]['objet_uuid']);

        // Le reste est réservé pendant le paiement en cours.
        $this->en($this->parent)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => 60000])->assertStatus(422);

        // Notification avant approbation : rien n'est enregistré.
        $this->notifier($p['encaissement_uuid'])->assertOk()->assertJsonPath('data.statut', 'en_attente');
        $this->assertSame(0, DB::table('finances.reglements')->count());

        $this->encaissements[$p['encaissement_uuid']]['statut'] = 'approuve';
        $this->encaissements[$p['encaissement_uuid']]['approuve_le'] = now()->toIso8601String();
        $this->notifier($p['encaissement_uuid'])->assertOk()->assertJsonPath('data.statut', 'approuve');
        $this->notifier($p['encaissement_uuid'])->assertOk();

        $this->assertSame(1, DB::table('finances.reglements')->count());
        $this->en($this->parent)->getJson("/v1/factures/{$this->facture['uuid']}")->assertOk()
            ->assertJsonPath('data.montant_regle', 100000)->assertJsonPath('data.reglements.0.mode', 'en_ligne')
            ->assertJsonPath('data.reglements.0.recu_disponible', true);
        $this->en($this->parent)->getJson("/v1/paiements/{$p['uuid']}")->assertOk()->assertJsonPath('data.acquis', true);
    }

    public function test_relecture_par_le_suivi_du_payeur(): void
    {
        $p = $this->payer(150000);
        $this->encaissements[$p['encaissement_uuid']]['statut'] = 'disponible';
        $this->travel(15)->seconds();

        $this->en($this->parent)->getJson("/v1/paiements/{$p['uuid']}")->assertOk()->assertJsonPath('data.statut', 'disponible');
        $this->en($this->admin)->getJson("/v1/factures/{$this->facture['uuid']}")->assertJsonPath('data.statut', 'reglee');
        $this->en($this->parent)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => 1000])->assertStatus(409);
    }

    public function test_remboursement_chez_paiement_produit_un_ajustement_negatif(): void
    {
        $p = $this->payer();
        $this->encaissements[$p['encaissement_uuid']]['statut'] = 'approuve';
        $this->notifier($p['encaissement_uuid'])->assertOk();
        $this->encaissements[$p['encaissement_uuid']]['statut'] = 'rembourse_partiel';
        $this->encaissements[$p['encaissement_uuid']]['montant_rembourse'] = 30000;
        $this->notifier($p['encaissement_uuid'])->assertOk();
        $this->notifier($p['encaissement_uuid'])->assertOk();

        $this->assertSame([100000, -30000], DB::table('finances.reglements')->orderBy('id')->pluck('montant')->map(fn ($m) => (int) $m)->all());
        $this->en($this->admin)->getJson("/v1/factures/{$this->facture['uuid']}")->assertJsonPath('data.montant_regle', 70000);
    }

    public function test_encaissement_incoherent_jamais_enregistre(): void
    {
        $p = $this->payer();
        $this->encaissements[$p['encaissement_uuid']]['statut'] = 'approuve';
        $this->encaissements[$p['encaissement_uuid']]['montant'] = 5000;

        $this->notifier($p['encaissement_uuid'])->assertStatus(503);
        $this->assertSame(0, DB::table('finances.reglements')->count());
    }

    public function test_notification_inconnue_et_paiement_indisponible(): void
    {
        $this->notifier((string) Str::uuid())->assertNotFound();

        $this->paiementEnPanne = true;
        $this->en($this->parent)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => 100000])->assertStatus(503);
        $this->assertSame('echec_creation', DB::table('finances.paiements_en_ligne')->value('statut'));
        // L'échec ne réserve pas le reste à payer.
        $this->paiementEnPanne = false;
        $this->payer(150000);
    }

    public function test_un_autre_parent_ou_une_adresse_de_retour_etrangere_refuses(): void
    {
        [$autre] = $this->utilisateur('parent');
        $this->en($autre)->getJson("/v1/factures/{$this->facture['uuid']}")->assertNotFound();
        $this->en($autre)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => 1000])->assertNotFound();
        $this->en($autre)->getJson("/v1/apprenants/{$this->enfant}/solde")->assertNotFound();
        $this->en($autre)->getJson('/v1/mes-finances')->assertOk()->assertJsonCount(0, 'data');

        $this->en($this->parent)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => 1000, 'url_retour' => 'https://pirate.example/vol'])
            ->assertStatus(422)->assertJsonPath('error.code', 'DONNEES_INVALIDES');
        $this->en($this->parent)->postJson("/v1/factures/{$this->facture['uuid']}/paiements", ['montant' => 200000])->assertStatus(422);
    }

    public function test_synchronisation_planifiee(): void
    {
        $p = $this->payer();
        $this->encaissements[$p['encaissement_uuid']]['statut'] = 'approuve';

        $this->assertSame(0, $this->artisan('finances:synchroniser-paiements'));
        $this->assertSame(100000, (int) DB::table('finances.reglements')->value('montant'));
    }

    public function test_vues_internes_pour_scolarite_et_demandes(): void
    {
        $this->interne()->getJson("/v1/interne/solde/{$this->enfant}")->assertOk()
            ->assertJsonPath('data.reste_a_payer', 150000)->assertJsonPath('data.a_jour', false);
        $this->interne()->withHeaders(['X-Tenant-Id' => $this->autreEtab])->getJson("/v1/interne/solde/{$this->enfant}")
            ->assertOk()->assertJsonPath('data.nombre_factures', 0);

        $this->interne()->getJson("/v1/interne/apprenants/paiements?apprenant_uuid={$this->enfant}&tenant_id=1")->assertOk()
            ->assertJsonPath('data.total_du', 150000)->assertJsonPath('data.statut_global', 'EN_RETARD')
            ->assertJsonPath('data.factures.0.numero', $this->facture['numero']);
        $this->interne()->getJson('/v1/interne/apprenants/paiements?apprenant_uuid='.Str::uuid())->assertNotFound();
    }
}
