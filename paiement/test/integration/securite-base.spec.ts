import { readFileSync } from 'fs';
import { join } from 'path';
import { LivreService } from '../../src/livre/livre.service';
import { avecContexte } from '../../src/database/contexte';
import { BaseTest, demarrerBase } from '../helpers/base';
import { creerEncaissement, creerMode, idAgregateur, uuid } from '../helpers/donnees';

describe('Garanties de sécurité portées par la base', () => {
  let base: BaseTest;
  let livre: LivreService;
  let agregateurId: string;

  beforeAll(async () => {
    base = await demarrerBase();
    livre = new LivreService(base.ds);
    agregateurId = await idAgregateur(base.admin);
    await base.admin.query(readFileSync(join(__dirname, '../../docs/roles.sql'), 'utf8'));
  });
  afterAll(async () => { await base.arreter(); });

  describe('délégations du personnel (3 personnes au plus)', () => {
    const ajouter = (etab: string, user: string) =>
      base.admin.query(`INSERT INTO paiement.delegation_personnel (etablissement_uuid, utilisateur_uuid, peut_preparer, accorde_par) VALUES ($1, $2, true, $3)`, [etab, user, uuid()]);

    it('refuse la quatrième personne, accepte après retrait de l\'une', async () => {
      const etab = uuid();
      const users = [uuid(), uuid(), uuid(), uuid()];
      for (const u of users.slice(0, 3)) await ajouter(etab, u);
      await expect(ajouter(etab, users[3])).rejects.toThrow(/Trois personnes/);
      await base.admin.query(`UPDATE paiement.delegation_personnel SET actif = false WHERE etablissement_uuid = $1 AND utilisateur_uuid = $2`, [etab, users[0]]);
      await ajouter(etab, users[3]);
      // modifier les droits d'une personne déjà désignée reste possible
      await base.admin.query(`UPDATE paiement.delegation_personnel SET peut_approuver = true WHERE etablissement_uuid = $1 AND utilisateur_uuid = $2`, [etab, users[1]]);
    });

    it('tient la limite sous concurrence', async () => {
      const etab = uuid();
      const r = await Promise.allSettled(Array.from({ length: 8 }, () => base.ds.query(
        `INSERT INTO paiement.delegation_personnel (etablissement_uuid, utilisateur_uuid, peut_approuver, accorde_par) VALUES ($1, $2, true, $3)`, [etab, uuid(), uuid()])));
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(3);
      expect((await base.admin.query(`SELECT count(*)::int AS n FROM paiement.delegation_personnel WHERE etablissement_uuid = $1 AND actif`, [etab])).rows[0].n).toBe(3);
    });

    it('exige au moins un droit', async () => {
      await expect(base.admin.query(`INSERT INTO paiement.delegation_personnel (etablissement_uuid, utilisateur_uuid, accorde_par) VALUES ($1, $2, $3)`, [uuid(), uuid(), uuid()])).rejects.toThrow(/violates check constraint/);
    });
  });

  describe('numérotation des reçus', () => {
    it('attribue des numéros uniques et sans trou sous concurrence', async () => {
      const etab = uuid();
      const nums = await Promise.all(Array.from({ length: 25 }, () =>
        base.ds.transaction(async (m) => Number((await m.query(`SELECT paiement.prochaine_sequence_recu($1, 2026::smallint) AS n`, [etab]))[0].n))));
      expect([...nums].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    });

    it('ne laisse pas de trou quand la création du reçu est annulée', async () => {
      const etab = uuid();
      const qr = base.ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      expect(Number((await qr.query(`SELECT paiement.prochaine_sequence_recu($1, 2026::smallint) AS n`, [etab]))[0].n)).toBe(1);
      await qr.rollbackTransaction();
      await qr.release();
      expect(Number((await base.ds.query(`SELECT paiement.prochaine_sequence_recu($1, 2026::smallint) AS n`, [etab]))[0].n)).toBe(1);
    });

    it('rend les reçus immuables et uniques par opération', async () => {
      const etab = uuid(); const objet = uuid();
      const inserer = (obj: string, seq: number) => base.admin.query(
        `INSERT INTO paiement.recu (etablissement_uuid, annee, sequence, numero, type, objet_uuid, montant, devise, donnees_figees, empreinte_sha256, stockage_cle, signataire, signe_le, code_verification)
         VALUES ($1, 2026, $2, $3, 'encaissement', $4, 5000, 'XOF', '{}'::jsonb, repeat('a', 64), 'cle', 'Etablissement X', now(), $5)`, [etab, seq, `2026-${seq}`, obj, uuid()]);
      await inserer(objet, 1);
      await expect(inserer(objet, 2)).rejects.toThrow(/duplicate key/); // un seul reçu par paiement
      await expect(base.admin.query(`UPDATE paiement.recu SET montant = 1`)).rejects.toThrow(/ajout seul/);
      await expect(base.admin.query(`DELETE FROM paiement.recu`)).rejects.toThrow(/ajout seul/);
    });
  });

  describe('contraintes métier', () => {
    it('empêche deux comptes de réception actifs avec le même numéro, sauf après archivage', async () => {
      const etab = uuid(); const mode = await creerMode(base.admin, 'fedapay', 'moov', 'sortie');
      const creer = () => base.admin.query(
        `INSERT INTO paiement.compte_reception (etablissement_uuid, mode_paiement_id, devise, numero_chiffre, numero_empreinte, numero_masque, cle_version, nom_titulaire, cree_par)
         VALUES ($1, $2, 'XOF', 'v1.a.b.c', repeat('e', 64), '+229*****456', 1, 'T', $3) RETURNING id::text AS id`, [etab, mode, uuid()]);
      const c1 = (await creer()).rows[0].id;
      await expect(creer()).rejects.toThrow(/duplicate key/);
      await base.admin.query(`UPDATE paiement.compte_reception SET statut = 'archive' WHERE id = $1`, [c1]);
      await creer();
    });

    it('un seul interrupteur de sécurité actif par cible', async () => {
      const cible = uuid();
      const poser = () => base.admin.query(`INSERT INTO paiement.interrupteur_securite (portee, cible_uuid, motif, active_par) VALUES ('etablissement', $1, 'incident', $2)`, [cible, uuid()]);
      await poser();
      await expect(poser()).rejects.toThrow(/duplicate key/);
      await base.admin.query(`UPDATE paiement.interrupteur_securite SET actif = false WHERE cible_uuid = $1`, [cible]);
      await poser();
      await expect(base.admin.query(`INSERT INTO paiement.interrupteur_securite (portee, motif, active_par) VALUES ('etablissement', 'x', $1)`, [uuid()])).rejects.toThrow(/violates check constraint/);
    });

    it('vérifie la cohérence des montants et des frais, et la séparation préparateur / approbateur', async () => {
      const etab = uuid();
      const pf = (await livre.ouvrirPortefeuille(etab, 'XOF')).portefeuilleId;
      const dec = (montant: number, frais: number, aCharge: string, debite: number, recu: number, prepare: string | null = null, approuve: string | null = null) =>
        base.admin.query(
          `INSERT INTO paiement.decaissement (etablissement_uuid, portefeuille_id, agregateur_id, type, devise, montant, frais_a_charge, frais_agregateur, montant_debite, montant_recu,
             reference_marchande, cle_idempotence, prepare_par, approuve_par) VALUES ($1, $2, $3, 'personnel', 'XOF', $4, $5, $6, $7, $8, $9, $9, $10, $11)`,
          [etab, pf, agregateurId, montant, aCharge, frais, debite, recu, `r-${uuid()}`, prepare, approuve]);
      await dec(10000, 100, 'etablissement', 10100, 10000);
      await dec(10000, 100, 'beneficiaire', 10000, 9900);
      await expect(dec(10000, 100, 'etablissement', 10000, 10000)).rejects.toThrow(/violates check constraint/);
      await expect(dec(10000, 100, 'beneficiaire', 10100, 10000)).rejects.toThrow(/violates check constraint/);
      const u = uuid();
      await expect(dec(5000, 0, 'etablissement', 5000, 5000, u, u)).rejects.toThrow(/violates check constraint/); // même personne : jamais
      await dec(5000, 0, 'etablissement', 5000, 5000, u, uuid());
      await expect(creerEncaissement(base.admin, { etablissementUuid: etab, portefeuilleId: pf, agregateurId, montant: 10000, frais: 100, fraisACharge: 'payeur' })).resolves.toBeDefined();
      await expect(base.admin.query(`UPDATE paiement.encaissement SET montant_net = 1 WHERE etablissement_uuid = $1`, [etab])).rejects.toThrow(/violates check constraint/);
    });

    it('interdit la même référence marchande deux fois chez un agrégateur (pas de double paiement)', async () => {
      const etab = uuid();
      const pf = (await livre.ouvrirPortefeuille(etab, 'XOF')).portefeuilleId;
      await creerEncaissement(base.admin, { etablissementUuid: etab, portefeuilleId: pf, agregateurId, reference: 'REF-UNIQUE' });
      await expect(creerEncaissement(base.admin, { etablissementUuid: etab, portefeuilleId: pf, agregateurId, reference: 'REF-UNIQUE' })).rejects.toThrow(/duplicate key/);
    });
  });

  describe('isolation par établissement et rôle applicatif', () => {
    it('chaque établissement ne voit et n\'écrit que ses propres encaissements ; aucune suppression possible', async () => {
      const A = uuid(); const B = uuid();
      const pa = (await livre.ouvrirPortefeuille(A, 'XOF')).portefeuilleId;
      const pb = (await livre.ouvrirPortefeuille(B, 'XOF')).portefeuilleId;
      await creerEncaissement(base.admin, { etablissementUuid: A, portefeuilleId: pa, agregateurId });
      await creerEncaissement(base.admin, { etablissementUuid: A, portefeuilleId: pa, agregateurId });
      await creerEncaissement(base.admin, { etablissementUuid: B, portefeuilleId: pb, agregateurId });
      const compter = (etab: string | null, role: 'administrateur' | 'super_admin' = 'administrateur') =>
        avecContexte(base.ds, { role, etablissementUuid: etab, roleBase: 'paiement_app' },
          async (m) => (await m.query(`SELECT count(*)::int AS n FROM paiement.encaissement WHERE etablissement_uuid IN ($1, $2)`, [A, B]))[0].n);
      expect(await compter(A)).toBe(2);
      expect(await compter(B)).toBe(1);
      expect(await compter(null)).toBe(0);
      expect(await compter(null, 'super_admin')).toBe(3);
      await expect(avecContexte(base.ds, { role: 'administrateur', etablissementUuid: A, roleBase: 'paiement_app' },
        (m) => m.query(`UPDATE paiement.encaissement SET libelle = 'x' WHERE etablissement_uuid = $1`, [B]))).resolves.toBeDefined(); // 0 ligne visible : rien n'est modifié
      expect((await base.admin.query(`SELECT count(*)::int AS n FROM paiement.encaissement WHERE libelle = 'x'`)).rows[0].n).toBe(0);
      await expect(avecContexte(base.ds, { role: 'super_admin', roleBase: 'paiement_app' },
        (m) => m.query(`DELETE FROM paiement.encaissement`))).rejects.toThrow(/permission denied/);
      await expect(avecContexte(base.ds, { role: 'administrateur', etablissementUuid: A, roleBase: 'paiement_app' },
        (m) => m.query(`INSERT INTO paiement.encaissement (etablissement_uuid, portefeuille_id, agregateur_id, devise, montant, frais_a_charge, montant_paye, montant_net, reference_marchande, cle_idempotence)
                        VALUES ($1, $2, $3, 'XOF', 100, 'etablissement', 100, 100, 'x-intrus', 'x-intrus')`, [B, pb, agregateurId]))).rejects.toThrow(/row-level security/);
    });
  });
});
