import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { demarrer, en, Monde, nouveauMonde, SECRET, uuid } from './outils';

describe('Demandes administratives (bout en bout, PostgreSQL reel)', () => {
  let app: INestApplication;
  let source: DataSource;
  let monde: Monde;

  const E1 = uuid();
  const E2 = uuid();
  const admin = uuid();
  const parent = uuid();
  const autreParent = uuid();
  const eleveCompte = uuid();
  const prof = uuid();
  const secretaire = uuid();
  const alice = uuid();
  const bob = uuid();

  beforeAll(async () => {
    monde = nouveauMonde();
    monde.etablissements[E1] = 1;
    monde.etablissements[E2] = 2;
    monde.jetons = {
      admin: { sub: admin, tenantId: E1, roleCode: 'administrateur' },
      parent: { sub: parent, tenantId: E1, roleCode: 'parent' },
      autreParent: { sub: autreParent, tenantId: E1, roleCode: 'parent' },
      eleve: { sub: eleveCompte, tenantId: E1, roleCode: 'apprenant' },
      prof: { sub: prof, tenantId: E1, roleCode: 'enseignant' },
      secretaire: { sub: secretaire, tenantId: E1, roleCode: 'secretariat' },
      adminE2: { sub: uuid(), tenantId: E2, roleCode: 'administrateur' },
      superAdmin: { sub: uuid(), tenantId: null, roleCode: 'super_admin' },
    };
    monde.apprenants[alice] = {
      _tenant: 1,
      uuid: alice,
      statut: 'actif',
      nom: 'ADJO',
      prenom: 'Alice',
      matricule: 'M001',
      date_naissance: '2012-03-04',
      classe: { uuid: uuid(), nom: '5e A' },
      utilisateur_uuid: eleveCompte,
      parents: [{ parent_uuid: parent }],
    };
    monde.apprenants[bob] = {
      _tenant: 1,
      uuid: bob,
      statut: 'inactif',
      nom: 'BIO',
      prenom: 'Bob',
      matricule: 'M002',
      classe: { uuid: uuid(), nom: '3e B' },
      utilisateur_uuid: null,
      parents: [{ parent_uuid: autreParent }],
    };
    monde.personnel[prof] = {
      _tenant: 1,
      uuid: uuid(),
      utilisateur_uuid: prof,
      nom: 'HOUNSOU',
      prenom: 'Paul',
      nom_complet: 'HOUNSOU Paul',
      matricule: 'P010',
      fonction: 'Professeur de mathematiques',
      statut: 'actif',
      actif: true,
    };
    ({ app, source } = await demarrer(monde));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const types = async () => {
    const r = await en(app, 'admin').get('/types-document?tous=1').expect(200);
    return Object.fromEntries(r.body.data.map((t: any) => [t.code, t.uuid]));
  };

  // ------------------------------------------------------------------ Acces

  it('refuse un appel sans jeton, un jeton invalide, le super admin et un module non ouvert', async () => {
    await request(app.getHttpServer()).get('/types-document').expect(401);
    await en(app, 'inconnu')
      .get('/types-document')
      .expect(401)
      .expect((r) => expect(r.body.error.code).toBe('JETON_INVALIDE'));
    await en(app, 'superAdmin').get('/types-document').expect(403);
    const bloque = uuid();
    monde.jetons.bloque = { sub: bloque, tenantId: E1, roleCode: 'parent' };
    monde.sansAcces.add(bloque);
    await en(app, 'bloque')
      .get('/types-document')
      .expect(403)
      .expect((r) => expect(r.body.error.code).toBe('MODULE_NON_AUTORISE'));
  });

  it('les en-tetes Gateway ne valent rien sans le secret interne', async () => {
    await request(app.getHttpServer())
      .get('/types-document')
      .set({
        'X-User-Id': admin,
        'X-User-Role': 'administrateur',
        'X-Tenant-Id': '1',
      })
      .expect(401);
    await request(app.getHttpServer())
      .get('/types-document')
      .set({
        'X-Internal-Secret': SECRET,
        'X-User-Id': admin,
        'X-User-Role': 'administrateur',
        'X-Tenant-Id': E1,
      })
      .expect(200);
  });

  // ------------------------------------------------------------------ Types de document

  it('initialise les types standards (idempotent) et protege la configuration', async () => {
    await en(app, 'parent')
      .post('/types-document/initialiser')
      .expect(403)
      .expect((r) => expect(r.body.error.code).toBe('ACTION_NON_AUTORISEE'));
    const r = await en(app, 'admin').post('/types-document/initialiser').expect(201);
    expect(r.body.data.length).toBe(6);
    const r2 = await en(app, 'admin').post('/types-document/initialiser').expect(201);
    expect(r2.body.message).toContain('déjà présents');
    await en(app, 'adminE2')
      .get('/types-document')
      .expect(200)
      .expect((x) => expect(x.body.data).toHaveLength(0));
  });

  it('refuse une regle hors categorie', async () => {
    await en(app, 'admin')
      .post('/types-document', {
        code: 'test_x',
        nom: 'Test',
        categorie_demandeur: 'personnel',
        regles_eligibilite: { dossier_actif: true },
      })
      .expect(422);
    await en(app, 'admin')
      .post('/types-document', {
        code: 'test_y',
        nom: 'Test',
        categorie_demandeur: 'personnel',
        regles_eligibilite: { solde_a_jour: true },
      })
      .expect(422);
    await en(app, 'admin')
      .post('/types-document', {
        code: 'Mauvais Code',
        nom: 'Test',
        categorie_demandeur: 'apprenant',
        inconnu: 1,
      })
      .expect(422)
      .expect((r) => expect(r.body.error.code).toBe('DONNEES_INVALIDES'));
  });

  it('modifie un type : modele fusionne, code immuable, desactivation masquee aux usagers', async () => {
    const t = await types();
    const r = await en(app, 'admin')
      .patch(`/types-document/${t.releve_notes}`, {
        modele: { lieu: 'Cotonou' },
        delai_indicatif_jours: 5,
      })
      .expect(200);
    expect(r.body.data.modele.lieu).toBe('Cotonou');
    expect(r.body.data.modele.titre).toBe('RELEVÉ DE NOTES');
    await en(app, 'admin').patch(`/types-document/${t.releve_notes}`, { code: 'autre_code' }).expect(422);
    await en(app, 'admin').patch(`/types-document/${t.attestation_reussite}`, { actif: false }).expect(200);
    const visibles = (await en(app, 'parent').get('/types-document').expect(200)).body.data.map((x: any) => x.code);
    expect(visibles).not.toContain('attestation_reussite');
    await en(app, 'parent')
      .post('/demandes', {
        type_document_uuid: t.attestation_reussite,
        beneficiaire_apprenant_uuid: alice,
      })
      .expect(404);
    await en(app, 'admin').patch(`/types-document/${t.attestation_reussite}`, { actif: true }).expect(200);
  });

  it('documentation Swagger generee sans erreur', async () => {
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    expect(Object.keys(doc.paths).length).toBeGreaterThanOrEqual(20);
  });

  // ------------------------------------------------------------------ Demandes

  it('parcours complet : soumission, eligibilite, generation, lien signe, PDF', async () => {
    const t = await types();
    const r = await en(app, 'parent')
      .post('/demandes', {
        type_document_uuid: t.certificat_scolarite,
        beneficiaire_apprenant_uuid: alice,
        commentaire: '2 exemplaires',
      })
      .expect(201);
    const d = r.body.data;
    expect(d.statut).toBe('en_traitement');
    expect(d.reference).toMatch(/^DA-\d{4}-000001$/);
    expect(d.etapes.map((e: any) => e.statut)).toEqual(['recue', 'en_traitement']);
    expect(d.demandeur_uuid).toBeUndefined();

    // Doublon refuse tant que la premiere est en cours.
    await en(app, 'parent')
      .post('/demandes', {
        type_document_uuid: t.certificat_scolarite,
        beneficiaire_apprenant_uuid: alice,
      })
      .expect(409);

    // Le parent ne traite pas ; un role personnalise sans permission non plus.
    await en(app, 'parent').put(`/demandes/${d.uuid}/traiter`).expect(403);
    await en(app, 'secretaire').put(`/demandes/${d.uuid}/traiter`).expect(403);
    await en(app, 'secretaire').get(`/demandes/${d.uuid}`).expect(404);

    // L'administrateur accorde traiter + consulter au role "secretariat".
    await en(app, 'admin')
      .put('/gouvernance/permissions/secretariat', {
        permissions: [{ action: 'consulter_demandes' }, { action: 'traiter_demande' }],
      })
      .expect(200);
    const file = await en(app, 'secretaire').get('/demandes').expect(200);
    expect(file.body.data.elements[0].demandeur_uuid).toBe(parent);

    const traitee = await en(app, 'secretaire').put(`/demandes/${d.uuid}/traiter`).expect(200);
    expect(traitee.body.data.statut).toBe('prete');

    const lien = (await en(app, 'parent').get(`/demandes/${d.uuid}/document`).expect(200)).body.data.url;
    const pdf = await request(app.getHttpServer())
      .get(lien.replace('/v1', ''))
      .buffer(true)
      .parse((res, cb) => {
        const morceaux: Buffer[] = [];
        res.on('data', (c: Buffer) => morceaux.push(c));
        res.on('end', () => cb(null, Buffer.concat(morceaux)));
      })
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    if (process.env.PDF_APERCU) require('fs').writeFileSync(process.env.PDF_APERCU, pdf.body);

    // Lien modifie ou d'un autre etablissement : refuse.
    await request(app.getHttpServer()).get(lien.replace('/v1', '').replace('t=1', 't=2')).expect(403);

    // Document fige en base : plus aucune modification possible.
    await expect(
      source.query(`UPDATE demandes.demandes_administratives SET document = '{}'::jsonb WHERE uuid = $1`, [d.uuid]),
    ).rejects.toThrow(/delivre/);
    await expect(source.query(`DELETE FROM demandes.demande_etapes`)).rejects.toThrow(/ajout seul/);
  });

  it("un parent ne demande pas pour l'enfant d'un autre", async () => {
    const t = await types();
    await en(app, 'parent')
      .post('/demandes', {
        type_document_uuid: t.certificat_scolarite,
        beneficiaire_apprenant_uuid: bob,
      })
      .expect(403);
    await en(app, 'parent').post('/demandes', { type_document_uuid: t.certificat_scolarite }).expect(422);
  });

  it('dossier inactif : demande bloquee avec motif, derogation tracee, puis traitement', async () => {
    const t = await types();
    const d = (
      await en(app, 'autreParent')
        .post('/demandes', {
          type_document_uuid: t.certificat_scolarite,
          beneficiaire_apprenant_uuid: bob,
        })
        .expect(201)
    ).body;
    expect(d.data.statut).toBe('bloquee');
    expect(d.message).toContain("n'est pas actif");

    await en(app, 'admin').put(`/demandes/${d.data.uuid}/traiter`).expect(409);
    await en(app, 'secretaire')
      .put(`/demandes/${d.data.uuid}/derogation`, {
        motif: 'Dossier en cours de reactivation par la scolarite.',
      })
      .expect(403);
    await en(app, 'admin').put(`/demandes/${d.data.uuid}/derogation`, { motif: 'court' }).expect(422);
    const ok = await en(app, 'admin')
      .put(`/demandes/${d.data.uuid}/derogation`, {
        motif: 'Dossier en cours de reactivation par la scolarite.',
      })
      .expect(200);
    expect(ok.body.data.statut).toBe('en_traitement');
    expect(ok.body.data.derogation.motif).toContain('reactivation');
    await en(app, 'admin')
      .put(`/demandes/${d.data.uuid}/traiter`)
      .expect(200)
      .expect((r) => expect(r.body.data.statut).toBe('prete'));

    const journal = await source.query(`SELECT action FROM demandes.journal_audit WHERE action = 'demande.derogation'`);
    expect(journal).toHaveLength(1);
  });

  it('bulletins non publies : releve de notes bloque ; resoumission apres publication', async () => {
    const t = await types();
    const d = (
      await en(app, 'eleve')
        .post('/demandes', {
          type_document_uuid: t.releve_notes,
          beneficiaire_apprenant_uuid: alice,
        })
        .expect(201)
    ).body.data;
    expect(d.statut).toBe('bloquee');
    monde.bulletins[alice] = true;
    const r = await en(app, 'eleve').post(`/demandes/${d.uuid}/resoumettre`).expect(200);
    expect(r.body.data.statut).toBe('en_traitement');
    expect(r.body.data.etapes.map((e: any) => e.statut)).toEqual(['recue', 'bloquee', 'en_traitement']);
  });

  it('solde a jour verifie aupres de Finances : demande bloquee tant qu une echeance passee est impayee', async () => {
    const type = (
      await en(app, 'admin')
        .post('/types-document', {
          code: 'quitus',
          nom: 'Quitus de scolarité',
          categorie_demandeur: 'apprenant',
          regles_eligibilite: { dossier_actif: true, solde_a_jour: true },
        })
        .expect(201)
    ).body.data;
    monde.impayes[alice] = true;
    const d = (
      await en(app, 'eleve')
        .post('/demandes', { type_document_uuid: type.uuid, beneficiaire_apprenant_uuid: alice })
        .expect(201)
    ).body.data;
    expect(d.statut).toBe('bloquee');
    expect(d.motif_blocage).toContain('impayées');
    monde.impayes[alice] = false;
    const r = await en(app, 'eleve').post(`/demandes/${d.uuid}/resoumettre`).expect(200);
    expect(r.body.data.statut).toBe('en_traitement');
  });

  it('personnel : attestation de travail verifiee aupres de RH, refusee a un non-membre du personnel', async () => {
    const t = await types();
    const d = (await en(app, 'prof').post('/demandes', { type_document_uuid: t.attestation_travail }).expect(201)).body.data;
    expect(d.statut).toBe('en_traitement');
    await en(app, 'parent').post('/demandes', { type_document_uuid: t.attestation_travail }).expect(403);
    await en(app, 'prof')
      .post('/demandes', {
        type_document_uuid: t.attestation_travail,
        beneficiaire_apprenant_uuid: alice,
      })
      .expect(422);
    // Visible seulement du demandeur et des gestionnaires habilites.
    await en(app, 'parent').get(`/demandes/${d.uuid}`).expect(404);
  });

  it('annulation, rejet motive et statuts terminaux', async () => {
    const t = await types();
    const d = (
      await en(app, 'prof')
        .post('/demandes', {
          type_document_uuid: t.autre_demande,
          commentaire: 'Lettre de recommandation',
        })
        .expect(201)
    ).body.data;
    await en(app, 'admin').put(`/demandes/${d.uuid}/rejeter`, {}).expect(422);
    await en(app, 'admin')
      .put(`/demandes/${d.uuid}/rejeter`, {
        motif: 'Merci de passer au secretariat avec votre CV.',
      })
      .expect(200)
      .expect((r) => expect(r.body.data.motif_rejet).toContain('CV'));
    await en(app, 'prof').post(`/demandes/${d.uuid}/annuler`).expect(409);

    const d2 = (await en(app, 'prof').post('/demandes', { type_document_uuid: t.attestation_fonction }).expect(201)).body.data;
    await en(app, 'parent').post(`/demandes/${d2.uuid}/annuler`).expect(403);
    await en(app, 'prof')
      .post(`/demandes/${d2.uuid}/annuler`)
      .expect(200)
      .expect((r) => expect(r.body.data.statut).toBe('annulee'));
  });

  it('demande libre traitee avec un texte saisi par le gestionnaire', async () => {
    const t = await types();
    const d = (await en(app, 'prof').post('/demandes', { type_document_uuid: t.autre_demande }).expect(201)).body.data;
    await en(app, 'admin')
      .put(`/demandes/${d.uuid}/traiter`, {
        nom_complet: 'HOUNSOU Paul',
        corps: 'Nous recommandons vivement {{nom_complet}} pour ses qualites pedagogiques.',
      })
      .expect(200);
    const brut = await source.query(`SELECT document FROM demandes.demandes_administratives WHERE uuid = $1`, [d.uuid]);
    expect(brut[0].document.corps).toBe('Nous recommandons vivement HOUNSOU Paul pour ses qualites pedagogiques.');
  });

  it('isolation : un autre etablissement ne voit rien', async () => {
    const mien = (await en(app, 'parent').get('/demandes/mes-demandes').expect(200)).body.data.elements[0];
    await en(app, 'adminE2').get(`/demandes/${mien.uuid}`).expect(404);
    await en(app, 'adminE2')
      .get('/demandes')
      .expect(200)
      .expect((r) => expect(r.body.data.pagination.total).toBe(0));
  });

  it('dependance en panne : 503, jamais une demande acceptee au hasard', async () => {
    const t = await types();
    monde.enPanne.add('scolarite');
    try {
      await en(app, 'parent')
        .post('/demandes', {
          type_document_uuid: t.attestation_reussite,
          beneficiaire_apprenant_uuid: alice,
        })
        .expect(503);
    } finally {
      monde.enPanne.delete('scolarite');
    }
  });

  // ------------------------------------------------------------------ Permissions d'absence

  it("permission d'absence : soumission, chevauchement, decision, endpoint Vie scolaire", async () => {
    const debut = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const fin = new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10);
    const p = (
      await en(app, 'parent')
        .post('/permissions-absence', {
          apprenant_uuid: alice,
          date_debut: debut,
          date_fin: fin,
          motif: 'Rendez-vous medical',
        })
        .expect(201)
    ).body.data;
    expect(p.statut).toBe('en_attente');
    await en(app, 'parent')
      .post('/permissions-absence', {
        apprenant_uuid: alice,
        date_debut: fin,
        date_fin: fin,
        motif: 'Autre motif',
      })
      .expect(409);
    await en(app, 'parent')
      .post('/permissions-absence', {
        apprenant_uuid: bob,
        date_debut: debut,
        date_fin: fin,
        motif: 'Voyage',
      })
      .expect(403);
    await en(app, 'parent')
      .post('/permissions-absence', {
        apprenant_uuid: alice,
        date_debut: fin,
        date_fin: debut,
        motif: 'Inverse',
      })
      .expect(422);

    await en(app, 'secretaire').put(`/permissions-absence/${p.uuid}/decision`, { decision: 'validee' }).expect(403);
    await en(app, 'admin').put(`/permissions-absence/${p.uuid}/decision`, { decision: 'rejetee' }).expect(422);
    await en(app, 'admin')
      .put(`/permissions-absence/${p.uuid}/decision`, { decision: 'validee' })
      .expect(200)
      .expect((r) => expect(r.body.data.statut).toBe('validee'));
    await en(app, 'admin')
      .put(`/permissions-absence/${p.uuid}/decision`, {
        decision: 'rejetee',
        motif: "Changement d'avis tardif",
      })
      .expect(409);

    const interne = (date: string) =>
      request(app.getHttpServer())
        .get(`/interne/permission-active/${alice}?date=${date}`)
        .set({ 'X-Internal-Secret': SECRET, 'X-Tenant-Id': '1' });
    await interne(debut)
      .expect(200)
      .expect((r) => expect(r.body.data.permissionnaire).toBe(true));
    await interne('2020-01-01')
      .expect(200)
      .expect((r) => expect(r.body.data.permissionnaire).toBe(false));
    await request(app.getHttpServer()).get(`/interne/permission-active/${alice}`).set({ 'X-Tenant-Id': '1' }).expect(401);
  });

  // ------------------------------------------------------------------ Reclamations

  it('reclamation : fil bidirectionnel, perimetre par categorie, accuses de lecture, cloture', async () => {
    const r = (
      await en(app, 'parent')
        .post('/reclamations', {
          categorie: 'finances',
          objet: 'Double facturation',
          message: 'Nous avons ete factures deux fois pour la cantine.',
          beneficiaire_apprenant_uuid: alice,
        })
        .expect(201)
    ).body.data;
    expect(r.reference).toMatch(/^RC-\d{4}-000001$/);
    expect(r.messages).toHaveLength(1);

    // Secretariat limite a la categorie "pedagogique" : ne voit pas cette reclamation.
    await en(app, 'admin')
      .put('/gouvernance/permissions/secretariat', {
        permissions: [
          { action: 'consulter_demandes' },
          {
            action: 'repondre_reclamation',
            perimetre: { categories: ['pedagogique'] },
          },
        ],
      })
      .expect(200);
    await en(app, 'secretaire').get(`/reclamations/${r.uuid}`).expect(404);
    await en(app, 'secretaire')
      .get('/reclamations')
      .expect(200)
      .expect((x) => expect(x.body.data.pagination.total).toBe(0));

    const vue = (await en(app, 'admin').get(`/reclamations/${r.uuid}`).expect(200)).body.data;
    expect(vue.mon_cote).toBe('etablissement');
    const rep = (
      await en(app, 'admin')
        .post(`/reclamations/${r.uuid}/messages`, {
          contenu: 'Nous verifions et revenons vers vous.',
        })
        .expect(201)
    ).body.data;
    expect(rep.statut).toBe('en_cours');

    const cote = (await en(app, 'parent').get('/reclamations/mes-reclamations').expect(200)).body.data.elements[0];
    expect(cote.non_lu).toBe(true);
    await en(app, 'parent').get(`/reclamations/${r.uuid}`).expect(200);
    expect((await en(app, 'parent').get('/reclamations/mes-reclamations')).body.data.elements[0].non_lu).toBe(false);

    await en(app, 'autreParent').get(`/reclamations/${r.uuid}`).expect(404);
    await en(app, 'admin').put(`/reclamations/${r.uuid}/statut`, { statut: 'cloturee' }).expect(200);
    await en(app, 'parent').post(`/reclamations/${r.uuid}/messages`, { contenu: 'Merci' }).expect(409);
    await expect(source.query(`UPDATE demandes.message_reclamation SET contenu = 'x'`)).rejects.toThrow(/ajout seul/);
  });

  it("l'etablissement ouvre un echange vers un usager", async () => {
    const r = (
      await en(app, 'admin')
        .post('/reclamations/vers-usager', {
          destinataire_uuid: parent,
          categorie: 'discipline',
          objet: 'Convocation',
          message: 'Merci de passer jeudi a 10h.',
        })
        .expect(201)
    ).body.data;
    expect(r.initiee_par).toBe('etablissement');
    const chezParent = (await en(app, 'parent').get(`/reclamations/${r.uuid}`).expect(200)).body.data;
    expect(chezParent.mon_cote).toBe('usager');
    await en(app, 'parent')
      .post('/reclamations/vers-usager', {
        destinataire_uuid: admin,
        categorie: 'autre',
        objet: 'Essai interdit',
        message: 'Je ne peux pas faire ca.',
      })
      .expect(403);
  });

  // ------------------------------------------------------------------ Gouvernance et statistiques

  it("seul l'administrateur configure la grille ; il ne peut pas se retirer ses droits", async () => {
    await en(app, 'secretaire').put('/gouvernance/permissions/secretariat', { permissions: [] }).expect(403);
    await en(app, 'admin').put('/gouvernance/permissions/administrateur', { permissions: [] }).expect(422);
    await en(app, 'admin')
      .put('/gouvernance/permissions/secretariat', {
        permissions: [{ action: 'pirater' }],
      })
      .expect(422);
    const g = (await en(app, 'admin').get('/gouvernance/permissions').expect(200)).body.data;
    expect(g.actions).toHaveLength(7);
    expect(g.roles[0].role_code).toBe('secretariat');
    expect((await en(app, 'secretaire').get('/gouvernance/mes-actions')).body.data.actions).toEqual([
      'consulter_demandes',
      'repondre_reclamation',
    ]);

    const changements = await source.query(
      `SELECT count(*)::int AS n FROM demandes.journal_audit WHERE action = 'permissions.role.modifiees'`,
    );
    expect(changements[0].n).toBeGreaterThanOrEqual(2);
  });

  it('statistiques reservees aux roles habilites', async () => {
    await en(app, 'secretaire').get('/statistiques').expect(403);
    const s = (await en(app, 'admin').get('/statistiques').expect(200)).body.data;
    expect(s.demandes.par_statut.prete).toBeGreaterThanOrEqual(2);
    expect(s.permissions_absence.en_attente).toBe(0);
  });

  it('mes apprenants : le parent voit ses enfants, l apprenant son dossier, le personnel rien ; noms dans la file', async () => {
    const mes = (await en(app, 'parent').get('/mes-apprenants').expect(200)).body.data;
    expect(mes).toEqual([{ uuid: alice, nom: 'ADJO', prenom: 'Alice', matricule: 'M001', classe: '5e A' }]);
    expect((await en(app, 'eleve').get('/mes-apprenants').expect(200)).body.data.map((a: any) => a.uuid)).toEqual([alice]);
    expect((await en(app, 'autreParent').get('/mes-apprenants').expect(200)).body.data.map((a: any) => a.uuid)).not.toContain(alice);
    expect((await en(app, 'admin').get('/mes-apprenants').expect(200)).body.data).toEqual([]);

    const t = await types();
    const d = (await en(app, 'parent').post('/demandes', { type_document_uuid: t.certificat_scolarite, beneficiaire_apprenant_uuid: alice }).expect(201))
      .body.data;
    const file = (await en(app, 'admin').get('/demandes?par_page=100').expect(200)).body.data.elements;
    expect(file.find((x: any) => x.uuid === d.uuid).beneficiaire).toMatchObject({ nom: 'ADJO', classe: '5e A' });
    expect((await en(app, 'parent').get(`/demandes/${d.uuid}`).expect(200)).body.data.beneficiaire.prenom).toBe('Alice');
  });
});
