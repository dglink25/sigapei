import { MontantInvalideError, depuisMajeur, exigerMontantPositif, formaterMontant, fraisEstimes, verifierBornes, versEntier, versMajeur } from '../../src/common/utils/money.util';

describe('Montants', () => {
  it('accepte uniquement des entiers', () => {
    expect(versEntier(5000)).toBe(5000n);
    expect(versEntier('5000')).toBe(5000n);
    expect(versEntier(5000n)).toBe(5000n);
    for (const mauvais of [12.5, '12.5', 'abc', NaN, Infinity, null, undefined, {}, Number.MAX_SAFE_INTEGER + 2]) {
      expect(() => versEntier(mauvais)).toThrow(MontantInvalideError);
    }
  });

  it('exige un montant strictement positif', () => {
    expect(exigerMontantPositif(1)).toBe(1n);
    expect(() => exigerMontantPositif(0)).toThrow(MontantInvalideError);
    expect(() => exigerMontantPositif(-5)).toThrow(MontantInvalideError);
  });

  it('convertit unités majeures <-> mineures selon l\'exposant de la devise', () => {
    expect(depuisMajeur('5000', 0)).toBe(5000n); // XOF
    expect(depuisMajeur('12.50', 2)).toBe(1250n); // CDF
    expect(depuisMajeur('12.5', 2)).toBe(1250n);
    expect(depuisMajeur('12', 2)).toBe(1200n);
    expect(() => depuisMajeur('12.5', 0)).toThrow(MontantInvalideError);
    expect(() => depuisMajeur('12.505', 2)).toThrow(MontantInvalideError);
    expect(() => depuisMajeur('-3', 2)).toThrow(MontantInvalideError);
    expect(versMajeur(1250n, 2)).toBe('12.50');
    expect(versMajeur(5n, 2)).toBe('0.05');
    expect(versMajeur(5000n, 0)).toBe('5000');
    expect(versMajeur(-1250n, 2)).toBe('-12.50');
  });

  it('formate pour l\'affichage', () => {
    const texte = formaterMontant(50000n, { code: 'XOF', exposant: 0 });
    expect(texte.replace(/\s/g, '')).toMatch(/50000/);
    expect(texte).toMatch(/CFA/);
  });

  it('calcule les frais en arithmétique entière, arrondis au supérieur', () => {
    expect(fraisEstimes(10000n, '1.5', 0n)).toBe(150n);
    expect(fraisEstimes(10001n, '1.5', 0n)).toBe(151n); // 150,015 -> 151
    expect(fraisEstimes(10000n, 2, 25n)).toBe(225n);
    expect(fraisEstimes(1n, '0.0001', 0n)).toBe(1n);
    expect(fraisEstimes(5000n, 0, 100n)).toBe(100n);
    expect(() => fraisEstimes(100n, '1.23456', 0n)).toThrow(MontantInvalideError);
    expect(() => fraisEstimes(100n, '-1', 0n)).toThrow(MontantInvalideError);
  });

  it('vérifie minimum, maximum et multiple imposés par un mode de paiement', () => {
    const r = { min: 100n, max: 1_500_000n, multiple: 5n };
    expect(() => verifierBornes(100n, r)).not.toThrow();
    expect(() => verifierBornes(99n, r)).toThrow(/minimum/);
    expect(() => verifierBornes(1_500_005n, r)).toThrow(/maximum/);
    expect(() => verifierBornes(103n, r)).toThrow(/multiple/);
    expect(() => verifierBornes(10n ** 12n, { min: 1n })).not.toThrow();
  });
});
