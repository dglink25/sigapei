import { ConflictException, BadRequestException } from '@nestjs/common';
import { LivreService, PortefeuilleOuvert } from '../../src/livre/livre.service';
import { BaseTest, demarrerBase } from '../helpers/base';
import { idAgregateur, uuid } from '../helpers/donnees';

describe('Grand livre à double entrée', () => {
  let base: BaseTest;
  let livre: LivreService;
  let p: PortefeuilleOuvert;
  let ag: Record<'tresorerie' | 'creanceAgregateur' | 'reserveTests', string>;
  const etab = uuid();
  let n = 0;
  const cle = () => `test-${++n}`;

  beforeAll(async () => {
    base = await demarrerBase();
    livre = new LivreService(base.ds);
    p = await livre.ouvrirPortefeuille(etab, 'XOF');
    ag = await livre.ouvrirComptesAgregateur(await idAgregateur(base.admin), 'XOF');
  });
  afterAll(async () => { await base.arreter(); });

  const solde = async (compteId: string) => BigInt((await base.admin.query(`SELECT solde::text AS s FROM paiement.compte WHERE id = $1`, [compteId])).rows[0].s);

  it('ouvrir un portefeuille est idempotent', async () => {
    const encore = await livre.ouvrirPortefeuille(etab, 'XOF');
    expect(encore).toEqual(p);
    expect((await base.admin.query(`SELECT count(*)::int AS n FROM paiement.compte WHERE portefeuille_id = $1`, [p.portefeuilleId])).rows[0].n).toBe(4);
  });

  it('suit le cycle encaissement -> en attente -> disponible, avec les bons soldes à chaque étape', async () => {
    await livre.poster({ typeOperation: 'encaissement.approuve', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: ag.creanceAgregateur, sens: 'debit', montant: 49900n }, { compteId: p.comptes.attente, sens: 'credit', montant: 49900n } ] });
    expect(await solde(p.comptes.attente)).toBe(49900n);
    expect(await solde(ag.creanceAgregateur)).toBe(49900n);

    // règlement par l'agrégateur (72 h plus tard) : la créance devient trésorerie, l'attente devient disponible
    await livre.poster({ typeOperation: 'encaissement.regle', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: ag.tresorerie, sens: 'debit', montant: 49900n }, { compteId: ag.creanceAgregateur, sens: 'credit', montant: 49900n },
      ] });
    await livre.poster({ typeOperation: 'encaissement.disponible', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: p.comptes.attente, sens: 'debit', montant: 49900n }, { compteId: p.comptes.disponible, sens: 'credit', montant: 49900n } ] });

    expect(await livre.soldes(p.portefeuilleId)).toEqual({ attente: 0n, disponible: 49900n, reserve: 0n, avanceDue: 0n });
    expect(await solde(ag.tresorerie)).toBe(49900n);
    expect(await solde(ag.creanceAgregateur)).toBe(0n);
  });

  it('refuse une opération déséquilibrée, côté service ET côté base', async () => {
    await expect(livre.poster({ typeOperation: 'x', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: p.comptes.disponible, sens: 'debit', montant: 100n }, { compteId: p.comptes.reserve, sens: 'credit', montant: 99n } ] }))
      .rejects.toThrow(BadRequestException);
    // contournement du service : la base elle-même refuse à la validation
    await base.admin.query('BEGIN');
    try {
      const g = await base.admin.query(`INSERT INTO paiement.ecriture_groupe (type_operation, devise, cle_idempotence, empreinte_demande) VALUES ('x', 'XOF', $1, repeat('b', 64)) RETURNING id`, [cle()]);
      await base.admin.query(`INSERT INTO paiement.ecriture (groupe_id, compte_id, sens, montant) VALUES ($1, $2, 'credit', 100)`, [g.rows[0].id, p.comptes.reserve]);
      await expect(base.admin.query('COMMIT')).rejects.toThrow(/desequilibrees/);
    } finally {
      await base.admin.query('ROLLBACK');
    }
  });

  it('refuse les lignes invalides (montant nul, doublon de compte, une seule ligne)', async () => {
    const base2 = { typeOperation: 'x', devise: 'XOF', cleIdempotence: cle() };
    await expect(livre.poster({ ...base2, lignes: [{ compteId: p.comptes.disponible, sens: 'debit', montant: 0n }, { compteId: p.comptes.reserve, sens: 'credit', montant: 0n }] })).rejects.toThrow(BadRequestException);
    await expect(livre.poster({ ...base2, lignes: [{ compteId: p.comptes.disponible, sens: 'debit', montant: 5n }] })).rejects.toThrow(BadRequestException);
    await expect(livre.poster({ ...base2, lignes: [
      { compteId: p.comptes.disponible, sens: 'debit', montant: 5n }, { compteId: p.comptes.disponible, sens: 'credit', montant: 5n } ] })).rejects.toThrow(BadRequestException);
  });

  it('interdit un solde négatif', async () => {
    await expect(livre.poster({ typeOperation: 'retrait.reserve', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: p.comptes.disponible, sens: 'debit', montant: 49901n }, { compteId: p.comptes.reserve, sens: 'credit', montant: 49901n } ] }))
      .rejects.toThrow(/violates check constraint/);
    expect((await livre.soldes(p.portefeuilleId)).disponible).toBe(49900n);
  });

  it('est idempotent : rejouer une opération ne la double pas ; la même clé pour autre chose est refusée', async () => {
    const demande = { typeOperation: 'retrait.reserve', devise: 'XOF', cleIdempotence: 'retrait-1', lignes: [
      { compteId: p.comptes.disponible, sens: 'debit' as const, montant: 1000n }, { compteId: p.comptes.reserve, sens: 'credit' as const, montant: 1000n } ] };
    const a = await livre.poster(demande);
    const b = await livre.poster(demande);
    expect(a.dejaPoste).toBe(false);
    expect(b).toEqual({ groupeUuid: a.groupeUuid, dejaPoste: true });
    expect((await livre.soldes(p.portefeuilleId)).reserve).toBe(1000n);
    await expect(livre.poster({ ...demande, lignes: [
      { compteId: p.comptes.disponible, sens: 'debit', montant: 2000n }, { compteId: p.comptes.reserve, sens: 'credit', montant: 2000n } ] })).rejects.toThrow(ConflictException);
  });

  it('rejoue en parallèle la même opération sans jamais la doubler', async () => {
    const demande = { typeOperation: 'retrait.reserve', devise: 'XOF', cleIdempotence: 'parallele-1', lignes: [
      { compteId: p.comptes.disponible, sens: 'debit' as const, montant: 500n }, { compteId: p.comptes.reserve, sens: 'credit' as const, montant: 500n } ] };
    const avant = await livre.soldes(p.portefeuilleId);
    const r = await Promise.all(Array.from({ length: 8 }, () => livre.poster(demande)));
    expect(r.filter((x) => !x.dejaPoste)).toHaveLength(1);
    const apres = await livre.soldes(p.portefeuilleId);
    expect(apres.reserve - avant.reserve).toBe(500n);
  });

  it('empêche tout découvert sous charge concurrente', async () => {
    const e2 = uuid();
    const p2 = await livre.ouvrirPortefeuille(e2, 'XOF');
    await livre.poster({ typeOperation: 'approvisionnement', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: ag.tresorerie, sens: 'debit', montant: 1000n }, { compteId: p2.comptes.disponible, sens: 'credit', montant: 1000n } ] });
    const resultats = await Promise.allSettled(Array.from({ length: 15 }, (_, i) =>
      livre.poster({ typeOperation: 'retrait.reserve', devise: 'XOF', cleIdempotence: `conc-${i}`, lignes: [
        { compteId: p2.comptes.disponible, sens: 'debit', montant: 100n }, { compteId: p2.comptes.reserve, sens: 'credit', montant: 100n } ] })));
    expect(resultats.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect(await livre.soldes(p2.portefeuilleId)).toEqual({ attente: 0n, disponible: 0n, reserve: 1000n, avanceDue: 0n });
  });

  it('reste sans interblocage même en contournant le service (écritures SQL concurrentes)', async () => {
    const p3 = await livre.ouvrirPortefeuille(uuid(), 'XOF');
    await livre.poster({ typeOperation: 'approvisionnement', devise: 'XOF', cleIdempotence: cle(), lignes: [
      { compteId: ag.tresorerie, sens: 'debit', montant: 2000n }, { compteId: p3.comptes.disponible, sens: 'credit', montant: 2000n } ] });
    const tache = async (i: number) => {
      const qr = base.ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const g = await qr.query(`INSERT INTO paiement.ecriture_groupe (type_operation, devise, cle_idempotence, empreinte_demande) VALUES ('x', 'XOF', $1, repeat('c', 64)) RETURNING id`, [`sql-${i}-${uuid()}`]);
        await qr.query(`INSERT INTO paiement.ecriture (groupe_id, compte_id, sens, montant) VALUES ($1, $2, 'debit', 100), ($1, $3, 'credit', 100)`, [g[0].id, p3.comptes.disponible, p3.comptes.reserve]);
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    };
    const r = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => tache(i)));
    const echecs = r.filter((x) => x.status === 'rejected').map((x) => String((x as PromiseRejectedResult).reason?.message));
    expect(echecs.filter((m) => /deadlock/i.test(m))).toEqual([]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(12);
    expect(await livre.soldes(p3.portefeuilleId)).toEqual({ attente: 0n, disponible: 800n, reserve: 1200n, avanceDue: 0n });
  });

  it('refuse une devise différente de celle du compte', async () => {
    await expect(livre.poster({ typeOperation: 'x', devise: 'XAF', cleIdempotence: cle(), lignes: [
      { compteId: p.comptes.disponible, sens: 'debit', montant: 10n }, { compteId: p.comptes.reserve, sens: 'credit', montant: 10n } ] }))
      .rejects.toThrow(/Devise du compte/);
  });

  it('rend les écritures immuables et le solde inaltérable hors écriture', async () => {
    await expect(base.admin.query(`UPDATE paiement.ecriture SET montant = 1 WHERE id = (SELECT min(id) FROM paiement.ecriture)`)).rejects.toThrow(/ajout seul/);
    await expect(base.admin.query(`DELETE FROM paiement.ecriture`)).rejects.toThrow(/ajout seul/);
    await expect(base.admin.query(`TRUNCATE paiement.ecriture_groupe CASCADE`)).rejects.toThrow(/ajout seul/);
    await expect(base.admin.query(`UPDATE paiement.compte SET solde = 999999 WHERE id = $1`, [p.comptes.disponible])).rejects.toThrow(/ecriture comptable/);
  });

  it('garde un grand livre cohérent : somme des soldes actifs = somme des soldes passifs', async () => {
    const r = await base.admin.query(`
      SELECT COALESCE(SUM(solde) FILTER (WHERE nature = 'actif'), 0)::text AS actif,
             COALESCE(SUM(solde) FILTER (WHERE nature = 'passif'), 0)::text AS passif FROM paiement.compte WHERE devise = 'XOF'`);
    expect(r.rows[0].actif).toBe(r.rows[0].passif);
  });

  it('ne permet pas d\'annuler la migration quand le grand livre contient des écritures', async () => {
    await expect(base.ds.undoLastMigration()).rejects.toThrow(/Annulation refusee/);
  });
});
