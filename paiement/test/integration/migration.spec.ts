import { BaseTest, demarrerBase } from '../helpers/base';

describe('Migration du schéma paiement', () => {
  let base: BaseTest;
  beforeAll(async () => { base = await demarrerBase(); });
  afterAll(async () => { await base.arreter(); });

  it('crée le schéma, les tables et les données de référence', async () => {
    const t = await base.admin.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'paiement'`);
    expect(t.rows[0].n).toBeGreaterThan(30);
    const d = await base.admin.query(`SELECT code, exposant FROM paiement.devise ORDER BY code`);
    expect(d.rows).toEqual([{ code: 'CDF', exposant: 2 }, { code: 'GNF', exposant: 0 }, { code: 'XAF', exposant: 0 }, { code: 'XOF', exposant: 0 }]);
    const a = await base.admin.query(`SELECT code, statut FROM paiement.agregateur ORDER BY code`);
    expect(a.rows).toEqual([{ code: 'cinetpay', statut: 'inactif' }, { code: 'fedapay', statut: 'inactif' }]);
  });

  it('applique la migration une seule fois et expose la table des migrations', async () => {
    const m = await base.admin.query(`SELECT count(*)::int AS n FROM paiement.migrations_typeorm`);
    expect(m.rows[0].n).toBe(1);
  });
});
