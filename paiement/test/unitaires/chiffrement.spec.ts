import { randomBytes } from 'crypto';
import { ChiffrementError, ChiffrementService } from '../../src/common/securite/chiffrement.service';

const cle = () => randomBytes(32).toString('base64');
const creer = (version = 1, cles: Record<string, string> = { '1': cle() }) =>
  new ChiffrementService({ cles, versionCourante: version, cleEmpreinte: cle() });

describe('Chiffrement des données sensibles', () => {
  it('chiffre et déchiffre (aller-retour) sans jamais produire deux fois le même chiffré', () => {
    const s = creer();
    const a = s.chiffrer('+22997123456', 'compte:abc');
    const b = s.chiffrer('+22997123456', 'compte:abc');
    expect(a).not.toBe(b);
    expect(a).not.toContain('22997123456');
    expect(s.dechiffrer(a, 'compte:abc')).toBe('+22997123456');
    expect(s.dechiffrer(b, 'compte:abc')).toBe('+22997123456');
  });

  it('refuse un contexte différent (un chiffré ne peut pas être rejoué ailleurs)', () => {
    const s = creer();
    const c = s.chiffrer('secret', 'etablissement:A');
    expect(() => s.dechiffrer(c, 'etablissement:B')).toThrow(ChiffrementError);
  });

  it('détecte toute altération du chiffré', () => {
    const s = creer();
    const c = s.chiffrer('secret', 'ctx');
    const [v, iv, tag, ct] = c.split('.');
    const altere = `${v}.${iv}.${tag}.${Buffer.from('autre').toString('base64url')}`;
    expect(() => s.dechiffrer(altere, 'ctx')).toThrow(ChiffrementError);
    expect(() => s.dechiffrer(`${v}.${iv}.${ct}.${ct}`, 'ctx')).toThrow(ChiffrementError);
    expect(() => s.dechiffrer('nimporte quoi', 'ctx')).toThrow(ChiffrementError);
  });

  it('supporte la rotation des clés : les anciens chiffrés restent lisibles', () => {
    const k1 = cle();
    const k2 = cle();
    const ancien = new ChiffrementService({ cles: { '1': k1 }, versionCourante: 1, cleEmpreinte: cle() });
    const jeton = ancien.chiffrer('valeur', 'ctx');
    const nouveau = new ChiffrementService({ cles: { '1': k1, '2': k2 }, versionCourante: 2, cleEmpreinte: cle() });
    expect(nouveau.dechiffrer(jeton, 'ctx')).toBe('valeur');
    expect(nouveau.versionDe(jeton)).toBe(1);
    expect(nouveau.versionDe(nouveau.chiffrer('x', 'ctx'))).toBe(2);
  });

  it('refuse une clé retirée du trousseau', () => {
    const k1 = cle();
    const ancien = new ChiffrementService({ cles: { '1': k1 }, versionCourante: 1, cleEmpreinte: cle() });
    const jeton = ancien.chiffrer('valeur', 'ctx');
    const sansV1 = new ChiffrementService({ cles: { '2': cle() }, versionCourante: 2, cleEmpreinte: cle() });
    expect(() => sansV1.dechiffrer(jeton, 'ctx')).toThrow(/indisponible/);
  });

  it('valide la taille des clés et la présence de la clé courante', () => {
    expect(() => new ChiffrementService({ cles: { '1': 'trop-courte' }, versionCourante: 1, cleEmpreinte: cle() })).toThrow(ChiffrementError);
    expect(() => new ChiffrementService({ cles: { '1': cle() }, versionCourante: 3, cleEmpreinte: cle() })).toThrow(/courante/);
    expect(() => new ChiffrementService({ cles: { '1': cle() }, versionCourante: 1, cleEmpreinte: 'x' })).toThrow(/empreinte/);
  });

  it('produit des empreintes stables, liées au contexte', () => {
    const s = creer();
    expect(s.empreinte('+22997123456', 'etab:A')).toBe(s.empreinte('+22997123456', 'etab:A'));
    expect(s.empreinte('+22997123456', 'etab:A')).not.toBe(s.empreinte('+22997123456', 'etab:B'));
    expect(s.empreinte('+22997123456', 'etab:A')).not.toBe(s.empreinte('+22997123457', 'etab:A'));
    expect(s.empreinte('+22997123456', 'etab:A')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('masque les numéros', () => {
    expect(ChiffrementService.masquerNumero('+22997123456')).toBe('+229*****456');
    expect(ChiffrementService.masquerNumero('+229 97 12 34 56')).toBe('+229*****456');
    expect(ChiffrementService.masquerNumero('97123456')).toBe('******56');
    expect(ChiffrementService.masquerNumero('1234')).toBe('****');
  });
});
