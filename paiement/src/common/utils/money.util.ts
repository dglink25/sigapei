/**
 * Montants : TOUJOURS des entiers en unités mineures (bigint). XOF/XAF/GNF : exposant 0 ; CDF : exposant 2.
 * Aucune opération en nombre à virgule flottante, aucune conversion entre devises.
 */
export interface Devise {
  code: string;
  exposant: number;
}

export class MontantInvalideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MontantInvalideError';
  }
}

/** Convertit en bigint en refusant tout ce qui n'est pas un entier (décimaux, NaN, texte libre, nombres non sûrs). */
export function versEntier(valeur: unknown): bigint {
  if (typeof valeur === 'bigint') return valeur;
  if (typeof valeur === 'number') {
    if (!Number.isSafeInteger(valeur)) throw new MontantInvalideError('Le montant doit etre un entier');
    return BigInt(valeur);
  }
  if (typeof valeur === 'string' && /^-?\d+$/.test(valeur.trim())) return BigInt(valeur.trim());
  throw new MontantInvalideError('Le montant doit etre un entier');
}

export function exigerMontantPositif(valeur: unknown): bigint {
  const m = versEntier(valeur);
  if (m <= 0n) throw new MontantInvalideError('Le montant doit etre strictement positif');
  return m;
}

/** "12.50" (CDF, exposant 2) -> 1250n ; "5000" (XOF) -> 5000n. Refuse les décimales en trop. */
export function depuisMajeur(texte: string, exposant: number): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(texte.trim());
  if (!m) throw new MontantInvalideError('Format de montant invalide');
  const decimales = m[2] ?? '';
  if (decimales.length > exposant) throw new MontantInvalideError(`Au plus ${exposant} decimale(s) pour cette devise`);
  return BigInt(m[1] + decimales.padEnd(exposant, '0'));
}

/** 1250n (exposant 2) -> "12.50" ; 5000n (exposant 0) -> "5000". */
export function versMajeur(montant: bigint, exposant: number): string {
  const negatif = montant < 0n;
  const brut = (negatif ? -montant : montant).toString().padStart(exposant + 1, '0');
  const entiere = exposant === 0 ? brut : brut.slice(0, -exposant);
  const decimale = exposant === 0 ? '' : `.${brut.slice(-exposant)}`;
  return `${negatif ? '-' : ''}${entiere}${decimale}`;
}

/** Affichage localisé : "50 000 F CFA" (jamais utilisé pour calculer). */
export function formaterMontant(montant: bigint, devise: Devise, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: devise.code, minimumFractionDigits: devise.exposant, maximumFractionDigits: devise.exposant,
  }).format(versMajeur(montant, devise.exposant) as unknown as number);
}

/** Frais estimés = ceil(montant x taux%) + fixe, en arithmétique entière (arrondi au supérieur, prudent). */
export function fraisEstimes(montant: bigint, tauxPourcent: string | number, fixe: bigint): bigint {
  const t = /^(\d+)(?:\.(\d{1,4}))?$/.exec(String(tauxPourcent));
  if (!t) throw new MontantInvalideError('Taux de frais invalide');
  const taux = BigInt(t[1] + (t[2] ?? '').padEnd(4, '0')); // taux x 10 000
  const base = 1_000_000n; // 100 x 10 000
  const proportionnel = (montant * taux + base - 1n) / base;
  return proportionnel + fixe;
}

/** Vérifie les bornes d'un mode de paiement (minimum, maximum éventuel, multiple imposé). */
export function verifierBornes(montant: bigint, regles: { min: bigint; max?: bigint | null; multiple?: bigint }): void {
  if (montant < regles.min) throw new MontantInvalideError(`Montant inferieur au minimum autorise (${regles.min})`);
  if (regles.max != null && montant > regles.max) throw new MontantInvalideError(`Montant superieur au maximum autorise (${regles.max})`);
  if (regles.multiple && regles.multiple > 1n && montant % regles.multiple !== 0n) {
    throw new MontantInvalideError(`Le montant doit etre un multiple de ${regles.multiple}`);
  }
}
