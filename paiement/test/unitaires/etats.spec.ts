import { MACHINES, NomMachine } from '../../src/common/etats/definitions';
import { estEtatInitial, estFinal, etatsFinaux, exigerTransition, peutTransiter, tousLesEtats, transitionsDepuis } from '../../src/common/etats/machine';

const noms = Object.keys(MACHINES) as NomMachine[];

describe('Machines à états', () => {
  it.each(noms)('%s : cohérente (cibles connues, états atteignables, au moins un état final)', (nom) => {
    const etats = new Set(tousLesEtats(nom));
    for (const [de, vers] of Object.entries(MACHINES[nom].transitions)) {
      expect(etats.has(de)).toBe(true);
      for (const v of vers) expect(etats.has(v)).toBe(true);
    }
    // tout état est atteignable depuis un état initial
    const atteints = new Set<string>(MACHINES[nom].initiaux);
    let change = true;
    while (change) {
      change = false;
      for (const e of [...atteints]) for (const v of transitionsDepuis(nom, e)) if (!atteints.has(v)) { atteints.add(v); change = true; }
    }
    expect([...etats].filter((e) => !atteints.has(e))).toEqual([]);
    // Les accords forment un cycle voulu (un accord refusé ou révoqué peut être redemandé) : aucun état final.
    if (nom !== 'accord_etablissement') expect(etatsFinaux(nom).length).toBeGreaterThan(0);
  });

  it('encaissement : un refus ou une annulation peut encore être approuvé (FedaPay), mais pas une expiration', () => {
    expect(peutTransiter('encaissement', 'refuse', 'approuve')).toBe(true);
    expect(peutTransiter('encaissement', 'annule', 'approuve')).toBe(true);
    expect(peutTransiter('encaissement', 'expire', 'approuve')).toBe(false);
    expect(peutTransiter('encaissement', 'approuve', 'initie')).toBe(false);
    expect(peutTransiter('encaissement', 'en_attente', 'disponible')).toBe(false); // il faut d'abord être approuvé
  });

  it('décaissement : un échec est définitif (nouvelle référence obligatoire), « incertain » se résout seulement par interrogation', () => {
    expect(estFinal('decaissement', 'echoue')).toBe(true);
    expect(estFinal('decaissement', 'envoye')).toBe(true);
    expect(peutTransiter('decaissement', 'echoue', 'soumis')).toBe(false);
    expect(peutTransiter('decaissement', 'incertain', 'soumis')).toBe(false);
    expect(peutTransiter('decaissement', 'incertain', 'envoye')).toBe(true);
    expect(peutTransiter('decaissement', 'brouillon', 'soumis')).toBe(false); // jamais sans approbation
    expect(peutTransiter('decaissement', 'brouillon', 'approuve')).toBe(false);
    expect(estEtatInitial('decaissement', 'approuve')).toBe(true); // reversements automatiques
  });

  it('compte de réception : validé seulement après les deux tests', () => {
    expect(peutTransiter('compte_reception', 'a_valider', 'valide')).toBe(false);
    expect(peutTransiter('compte_reception', 'test_encaissement', 'valide')).toBe(false);
    expect(peutTransiter('compte_reception', 'test_decaissement', 'valide')).toBe(true);
  });

  it('exigerTransition lève une 409 explicite', () => {
    expect(() => exigerTransition('remboursement', 'effectue', 'demande')).toThrow(/Transition interdite/);
    expect(() => exigerTransition('remboursement', 'demande', 'approuve')).not.toThrow();
    expect(() => exigerTransition('remboursement', 'demande', 'demande')).not.toThrow();
  });
});
