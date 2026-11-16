<?php

namespace Tests\Feature;

use Illuminate\Support\Str;

/** Routes qui servent à construire l'interface de chaque profil. */
class InterfaceTest extends ApiTestCase
{
    public function test_enseignant_voit_ses_affectations_uniquement(): void
    {
        $c = $this->configurer();
        $this->affecter($this->prof, $c['maths']);
        $this->affecter($this->autreProf, $c['maths'], (string) Str::uuid());

        $this->commeProf()->getJson('/v1/mes-affectations')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.classe_uuid', $this->classe)
            ->assertJsonPath('data.0.matiere.nom', 'Mathématiques');
        $this->commeAdmin()->getJson('/v1/mes-affectations')->assertStatus(403);
    }

    public function test_apprenant_et_parent_voient_leurs_dossiers(): void
    {
        $alice = $this->ajouterApprenant(champs: ['nom' => 'ADJO', 'utilisateur_uuid' => $this->eleveUser, 'parents' => [['parent_uuid' => $this->parent]]]);
        $this->ajouterApprenant(champs: ['nom' => 'BIO', 'parents' => [['parent_uuid' => $this->parent]]]);
        $this->ajouterApprenant(champs: ['nom' => 'AUTRE']);

        $this->en('apprenant', $this->eleveUser)->getJson('/v1/mes-apprenants')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.uuid', $alice)->assertJsonPath('data.0.classe.cycle', 'secondaire');
        $this->en('parent', $this->parent)->getJson('/v1/mes-apprenants')->assertOk()->assertJsonCount(2, 'data');
        $this->commeProf()->getJson('/v1/mes-apprenants')->assertStatus(403);
    }

    public function test_contrat_scolarite_incomplet_donne_503(): void
    {
        $this->ajouterApprenant(champs: ['utilisateur_uuid' => $this->eleveUser]);
        $this->contratComplet = false;

        $this->en('apprenant', $this->eleveUser)->getJson('/v1/mes-apprenants')->assertStatus(503);
    }

    public function test_grille_de_classe_contient_la_liste_des_apprenants(): void
    {
        $c = $this->configurer();
        $this->affecter($this->prof, $c['maths']);
        $this->ajouterApprenant(champs: ['nom' => 'ZINSOU', 'prenom' => 'Zoe']);
        $this->ajouterApprenant(champs: ['nom' => 'ADJO', 'prenom' => 'Alice']);

        $this->commeProf()->getJson("/v1/notes/classe/{$this->classe}?periode_uuid={$c['periode']}&matiere_uuid={$c['maths']}")->assertOk()
            ->assertJsonCount(2, 'data.apprenants')
            ->assertJsonPath('data.apprenants.0.nom', 'ADJO')
            ->assertJsonPath('data.periode.cycle', 'secondaire');
    }

    public function test_lecture_du_modele_de_bulletin(): void
    {
        $this->commeAdmin()->getJson('/v1/modeles-bulletin/secondaire')->assertOk()->assertJsonPath('data', null);
        $this->commeAdmin()->postJson('/v1/modeles-bulletin', ['cycle' => 'secondaire', 'en_tete' => ['titre' => 'Lycée Béhanzin'], 'colonnes_affichees' => ['matiere', 'moyenne']])->assertCreated();
        $this->commeAdmin()->getJson('/v1/modeles-bulletin/secondaire')->assertOk()->assertJsonPath('data.en_tete.titre', 'Lycée Béhanzin');
        $this->commeAdmin()->getJson('/v1/modeles-bulletin/maternelle')->assertNotFound();
        $this->commeProf()->getJson('/v1/modeles-bulletin/secondaire')->assertStatus(403);
    }
}
