import { MACHINES, NomMachine } from '../../src/common/etats/definitions';
import { LivreService } from '../../src/livre/livre.service';
import { BaseTest, demarrerBase } from '../helpers/base';
import { creerEncaissement, idAgregateur, uuid } from '../helpers/donnees';

describe('États contrôlés par la base', () => {
  let base: BaseTest;
  let portefeuilleId: string;
  let agregateurId: string;
  const etab = uuid();

  beforeAll(async () => {
    base = await demarrerBase();
    portefeuilleId = (await new LivreService(base.ds).ouvrirPortefeuille(etab, 'XOF')).portefeuilleId;
    agregateurId = await idAgregateur(base.admin);
  });
  afterAll(async () => { await base.arreter(); });

  it.each(Object.keys(MACHINES) as NomMachine[])('la table etat_transition correspond exactement au code (%s)', async (nom) => {
    const attendu = new Set<string>();
    for (const v of MACHINES[nom].initiaux) attendu.add(`∅>${v}`);
    for (const [de, vers] of Object.entries(MACHINES[nom].transitions)) for (const v of vers) attendu.add(`${de}>${v}`);
    const r = await base.admin.query(`SELECT de, vers FROM paiement.etat_transition WHERE objet = $1`, [nom]);
    const reel = new Set<string>(r.rows.map((x: { de: string | null; vers: string }) => `${x.de ?? '∅'}>${x.vers}`));
    expect(reel).toEqual(attendu);
  });

  it('refuse un état initial interdit', async () => {
    await expect(creerEncaissement(base.admin, { etablissementUuid: etab, portefeuilleId, agregateurId, statut: 'approuve' }))
      .rejects.toThrow(/Etat initial interdit/);
    await expect(
      base.admin.query(
        `INSERT INTO paiement.decaissement (etablissement_uuid, portefeuille_id, agregateur_id, type, devise, montant, frais_a_charge, montant_debite, montant_recu,
           reference_marchande, cle_idempotence, statut) VALUES ($1, $2, $3, 'retrait', 'XOF', 1000, 'etablissement', 1000, 1000, 'r1', 'c1', 'envoye')`,
        [etab, portefeuilleId, agregateurId],
      ),
    ).rejects.toThrow(/Etat initial interdit/);
  });

  it('refuse une transition interdite et journalise chaque changement de statut', async () => {
    const e = await creerEncaissement(base.admin, { etablissementUuid: etab, portefeuilleId, agregateurId });
    await expect(base.admin.query(`UPDATE paiement.encaissement SET statut = 'disponible' WHERE id = $1`, [e.id])).rejects.toThrow(/Transition interdite/);
    await base.admin.query(`UPDATE paiement.encaissement SET statut = 'en_attente' WHERE id = $1`, [e.id]);
    await base.admin.query(`UPDATE paiement.encaissement SET statut = 'approuve' WHERE id = $1`, [e.id]);
    await base.admin.query(`UPDATE paiement.encaissement SET statut = 'disponible' WHERE id = $1`, [e.id]);
    await expect(base.admin.query(`UPDATE paiement.encaissement SET statut = 'approuve' WHERE id = $1`, [e.id])).rejects.toThrow(/Transition interdite/);
    const h = await base.admin.query(`SELECT de, vers FROM paiement.historique_statut WHERE objet = 'encaissement' AND objet_id = $1 ORDER BY id`, [e.id]);
    expect(h.rows).toEqual([
      { de: null, vers: 'initie' }, { de: 'initie', vers: 'en_attente' }, { de: 'en_attente', vers: 'approuve' }, { de: 'approuve', vers: 'disponible' },
    ]);
  });

  it('un échec de payout est définitif : aucune reprise avec la même référence', async () => {
    const d = await base.admin.query(
      `INSERT INTO paiement.decaissement (etablissement_uuid, portefeuille_id, agregateur_id, type, devise, montant, frais_a_charge, montant_debite, montant_recu,
         reference_marchande, cle_idempotence, statut) VALUES ($1, $2, $3, 'retrait', 'XOF', 1000, 'etablissement', 1000, 1000, 'r2', 'c2', 'approuve') RETURNING id::text AS id`,
      [etab, portefeuilleId, agregateurId],
    );
    const id = d.rows[0].id;
    for (const s of ['fonds_reserves', 'soumis', 'echoue']) await base.admin.query(`UPDATE paiement.decaissement SET statut = $2 WHERE id = $1`, [id, s]);
    await expect(base.admin.query(`UPDATE paiement.decaissement SET statut = 'soumis' WHERE id = $1`, [id])).rejects.toThrow(/Transition interdite/);
    await expect(base.admin.query(`UPDATE paiement.decaissement SET statut = 'envoye' WHERE id = $1`, [id])).rejects.toThrow(/Transition interdite/);
  });

  it('un compte de réception ne devient valide qu\'après les deux tests', async () => {
    const mode = (await base.admin.query(
      `INSERT INTO paiement.mode_paiement (agregateur_id, code, libelle, pays, operateur, type, sens, devise, montant_min)
       VALUES ($1, 'moov', 'Moov', 'BJ', 'moov', 'mobile_money', 'sortie', 'XOF', 100) RETURNING id::text AS id`, [agregateurId])).rows[0].id;
    const c = await base.admin.query(
      `INSERT INTO paiement.compte_reception (etablissement_uuid, mode_paiement_id, devise, numero_chiffre, numero_empreinte, numero_masque, cle_version, nom_titulaire, cree_par)
       VALUES ($1, $2, 'XOF', 'v1.x.y.z', repeat('a', 64), '+229*****456', 1, 'Titulaire', $3) RETURNING id::text AS id`, [etab, mode, uuid()]);
    const id = c.rows[0].id;
    await expect(base.admin.query(`UPDATE paiement.compte_reception SET statut = 'valide' WHERE id = $1`, [id])).rejects.toThrow(/Transition interdite/);
    for (const s of ['test_encaissement', 'test_decaissement', 'valide']) await base.admin.query(`UPDATE paiement.compte_reception SET statut = $2 WHERE id = $1`, [id, s]);
    const h = await base.admin.query(`SELECT vers FROM paiement.historique_statut WHERE objet = 'compte_reception' AND objet_id = $1 ORDER BY id`, [id]);
    expect(h.rows.map((r: { vers: string }) => r.vers)).toEqual(['a_valider', 'test_encaissement', 'test_decaissement', 'valide']);
  });
});
