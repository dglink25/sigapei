import { createHash, timingSafeEqual } from 'crypto';

/** Comparaison en temps constant (les deux valeurs sont hachees pour egaliser les longueurs). */
export function egalTempsConstant(attendu: string, recu: string): boolean {
  const a = createHash('sha256').update(attendu).digest();
  const b = createHash('sha256').update(recu).digest();
  return timingSafeEqual(a, b);
}

/** Secret partage exploitable : present, different du placeholder, 32 caracteres minimum. */
export function secretValide(secret: string | undefined): secret is string {
  return !!secret && secret !== 'change-me' && secret.length >= 32;
}
