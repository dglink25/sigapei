import { ForbiddenException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AuditService, masquerDonnees } from '../../src/audit/audit.service';
import { avecContexte } from '../../src/database/contexte';
import { BaseTest, demarrerBase } from '../helpers/base';
import { uuid } from '../helpers/donnees';

describe("Journal d'audit chaîné et cloisonné", () => {
  let base: BaseTest;
  let audit: AuditService;
  const A = uuid();
  const B = uuid();
  const U1 = uuid(); const U2 = uuid(); const U3 = uuid();

  beforeAll(async () => {
    base = await demarrerBase();
    audit = new AuditService(base.ds);
    await base.admin.query(readFileSync(join(__dirname, '../../docs/roles.sql'), 'utf8'));
  });
  afterAll(async () => { await base.arreter(); });

  it('masque les secrets avant écriture', () => {
    expect(masquerDonnees({ nom: 'ok', numero_chiffre: 'x', nested: { api_key: 'k', token: 't', montant: 5n } })).toEqual({
      nom: 'ok', numero_chiffre: '***', nested: { api_key: '***', token: '***', montant: '5' },
    });
  });

  it('chaîne les événements de chaque flux séparément, et la chaîne est vérifiable', async () => {
    for (const a of ['a.un', 'a.deux', 'a.trois']) await audit.enregistrer({ etablissementUuid: A, acteurUuid: U1, acteurRole: 'administrateur', action: a });
    await audit.enregistrer({ etablissementUuid: B, acteurUuid: U3, action: 'b.un' });
    await audit.enregistrer({ action: 'plateforme.un', acteurRole: 'super_admin' });
    const r = await base.admin.query(`SELECT rang::int AS rang, prev_hash, hash FROM paiement.audit_evenement WHERE flux = $1 ORDER BY rang`, [A]);
    expect(r.rows.map((x: { rang: number }) => x.rang)).toEqual([1, 2, 3]);
    expect(r.rows[0].prev_hash).toBe('0'.repeat(64));
    expect(r.rows[1].prev_hash).toBe(r.rows[0].hash);
    expect(r.rows[2].prev_hash).toBe(r.rows[1].hash);
    for (const flux of [A, B, 'plateforme']) expect(await audit.verifierFlux(flux)).toEqual({ intact: true });
    expect((await base.admin.query(`SELECT rang::int AS rang FROM paiement.audit_evenement WHERE flux = $1`, [B])).rows).toEqual([{ rang: 1 }]);
  });

  it('ne conserve aucun secret dans le journal', async () => {
    const e = uuid();
    await audit.enregistrer({ etablissementUuid: e, action: 'compte.cree', avant: { numero: '+22997123456' }, apres: { token: 'abc', nom: 'X' } });
    const r = await base.admin.query(`SELECT avant, apres FROM paiement.audit_evenement WHERE flux = $1`, [e]);
    expect(r.rows[0].avant).toEqual({ numero: '***' });
    expect(r.rows[0].apres).toEqual({ token: '***', nom: 'X' });
  });

  it('est en ajout seul', async () => {
    await expect(base.admin.query(`UPDATE paiement.audit_evenement SET action = 'x'`)).rejects.toThrow(/ajout seul/);
    await expect(base.admin.query(`DELETE FROM paiement.audit_evenement`)).rejects.toThrow(/ajout seul/);
    await expect(base.admin.query(`TRUNCATE paiement.audit_evenement`)).rejects.toThrow(/ajout seul/);
  });

  it('détecte une falsification (contenu modifié) et une suppression (rang manquant)', async () => {
    const f1 = uuid(); const f2 = uuid();
    for (const f of [f1, f2]) for (let i = 1; i <= 4; i++) await audit.enregistrer({ etablissementUuid: f, action: `evt.${i}`, apres: { i } });
    await base.admin.query(`ALTER TABLE paiement.audit_evenement DISABLE TRIGGER trg_ajout_seul`);
    try {
      await base.admin.query(`UPDATE paiement.audit_evenement SET apres = '{"i": 999}'::jsonb WHERE flux = $1 AND rang = 2`, [f1]);
      await base.admin.query(`DELETE FROM paiement.audit_evenement WHERE flux = $1 AND rang = 3`, [f2]);
    } finally {
      await base.admin.query(`ALTER TABLE paiement.audit_evenement ENABLE TRIGGER trg_ajout_seul`);
    }
    expect(await audit.verifierFlux(f1)).toEqual({ intact: false, rangRompu: 2, motif: 'empreinte invalide' });
    expect(await audit.verifierFlux(f2)).toEqual({ intact: false, rangRompu: 4, motif: 'rang manquant' });
  });

  it('garde une chaîne intègre sous écritures concurrentes', async () => {
    const f = uuid();
    await Promise.all(Array.from({ length: 20 }, (_, i) => audit.enregistrer({ etablissementUuid: f, acteurUuid: U1, action: `conc.${i}` })));
    const r = await base.admin.query(`SELECT rang::int AS rang FROM paiement.audit_evenement WHERE flux = $1 ORDER BY rang`, [f]);
    expect(r.rows.map((x: { rang: number }) => x.rang)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(await audit.verifierFlux(f)).toEqual({ intact: true });
  });

  describe('cloisonnement de la consultation', () => {
    const E1 = uuid(); const E2 = uuid();
    beforeAll(async () => {
      await audit.enregistrer({ etablissementUuid: E1, acteurUuid: U1, acteurRole: 'utilisateur', action: 'paiement.cree' });
      await audit.enregistrer({ etablissementUuid: E1, acteurUuid: U1, acteurRole: 'utilisateur', action: 'paiement.consulte' });
      await audit.enregistrer({ etablissementUuid: E1, acteurUuid: U2, acteurRole: 'administrateur', action: 'config.modifiee', ip: '10.0.0.5' });
      await audit.enregistrer({ etablissementUuid: E2, acteurUuid: U3, acteurRole: 'administrateur', action: 'config.modifiee' });
      await audit.enregistrer({ action: 'agregateur.active', acteurRole: 'super_admin' });
    });

    it('super admin : voit tout, filtre par établissement ou par plateforme, avec les empreintes', async () => {
      const tout = await audit.lister({ limite: 100 }, { role: 'super_admin', utilisateurUuid: uuid() });
      expect(tout.pagination.total).toBeGreaterThan(5);
      expect(tout.evenements.some((e) => e.hash)).toBe(true);
      const e2 = await audit.lister({ etablissementUuid: E2 }, { role: 'super_admin', utilisateurUuid: uuid() });
      expect(e2.evenements.map((e) => e.action)).toEqual(['config.modifiee']);
      const pf = await audit.lister({ plateforme: true, limite: 100 }, { role: 'super_admin', utilisateurUuid: uuid() });
      expect(pf.evenements.every((e) => e.etablissement_uuid === null)).toBe(true);
      expect(pf.evenements.some((e) => e.action === 'agregateur.active')).toBe(true);
    });

    it('administrateur : uniquement son établissement, même s\'il demande un autre', async () => {
      const r = await audit.lister({ etablissementUuid: E2, limite: 100 }, { role: 'administrateur', etablissementUuid: E1, utilisateurUuid: U2, roleBase: 'paiement_app' });
      expect(r.pagination.total).toBe(3);
      expect(r.evenements.every((e) => e.etablissement_uuid === E1)).toBe(true);
      expect(r.evenements.every((e) => e.hash === undefined && e.ip === undefined)).toBe(true);
    });

    it('simple utilisateur : uniquement ses propres actions', async () => {
      const r = await audit.lister({ acteurUuid: U2 }, { role: 'utilisateur', etablissementUuid: E1, utilisateurUuid: U1, roleBase: 'paiement_app' });
      expect(r.pagination.total).toBe(2);
      expect(r.evenements.every((e) => e.acteur_uuid === U1)).toBe(true);
    });

    it('refuse un compte sans établissement', async () => {
      await expect(audit.lister({}, { role: 'administrateur', etablissementUuid: null, utilisateurUuid: U1 })).rejects.toThrow(ForbiddenException);
    });

    it('filtre par action, résultat et pagination', async () => {
      const r = await audit.lister({ actionPrefixe: 'paiement.', limite: 1, page: 2 }, { role: 'administrateur', etablissementUuid: E1, utilisateurUuid: U2 });
      expect(r.pagination).toEqual({ page: 2, limite: 1, total: 2, pages: 2 });
      expect(r.evenements).toHaveLength(1);
    });

    it('la base elle-même cloisonne (RLS) : rôle applicatif sans propriétaire', async () => {
      const compter = (etab: string | null) => avecContexte(base.ds, { role: 'administrateur', etablissementUuid: etab, roleBase: 'paiement_app' },
        async (m) => (await m.query(`SELECT count(*)::int AS n FROM paiement.audit_evenement`))[0].n);
      expect(await compter(E1)).toBe(3);
      expect(await compter(E2)).toBe(1);
      expect(await compter(null)).toBe(0);
      // écrire pour un autre établissement est refusé par la base
      await expect(avecContexte(base.ds, { role: 'administrateur', etablissementUuid: E1, roleBase: 'paiement_app' },
        (m) => audit.enregistrer({ etablissementUuid: E2, action: 'intrusion' }, m))).rejects.toThrow(/row-level security/);
      // journaliser pour son propre établissement fonctionne, et la chaîne reste intègre
      await avecContexte(base.ds, { role: 'administrateur', etablissementUuid: E1, roleBase: 'paiement_app' },
        (m) => audit.enregistrer({ etablissementUuid: E1, acteurUuid: U2, action: 'legitime' }, m));
      expect(await audit.verifierFlux(E1)).toEqual({ intact: true });
      // et le rôle applicatif ne peut ni modifier ni supprimer
      await expect(avecContexte(base.ds, { role: 'systeme', roleBase: 'paiement_app' },
        (m) => m.query(`UPDATE paiement.audit_evenement SET action = 'x'`))).rejects.toThrow(/permission denied/);
    });
  });
});
