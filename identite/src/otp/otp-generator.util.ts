import * as crypto from 'crypto';

const MAJUSCULES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I/O pour eviter la confusion visuelle
const MINUSCULES = 'abcdefghijkmnpqrstuvwxyz';
const CHIFFRES = '23456789';
const SPECIAUX = '!@#$%*?-_+=';

function tirer(alphabet: string, n: number): string[] {
  const résultat: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = crypto.randomInt(0, alphabet.length);
    résultat.push(alphabet[idx]);
  }
  return résultat;
}

function melanger<T>(tableau: T[]): T[] {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Genere un code OTP numerique a 6 chiffres (canal telephone : SMS/WhatsApp),
 * via un generateur cryptographiquement sur (section 6.1).
 */
export function genererOtpTelephone(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Genere un code OTP pour le canal e-mail respectant STRICTEMENT la regle demandee :
 *  - longueur exacte : 12 caracteres (ni plus, ni moins) ;
 *  - au moins 2 caracteres speciaux ;
 *  - au moins 2 lettres majuscules ;
 *  - au moins 2 lettres minuscules ;
 * (le reste est complete avec un melange majuscules/minuscules/chiffres/speciaux
 * pour maximiser l'entropie tout en respectant les minimums ci-dessus).
 */
export function genererOtpEmail(longueur = 12): string {
  if (longueur < 6) {
    throw new Error('La longueur du code e-mail doit permettre les 6 caracteres obligatoires minimum.');
  }
  const obligatoires = [
    ...tirer(MAJUSCULES, 2),
    ...tirer(MINUSCULES, 2),
    ...tirer(SPECIAUX, 2),
  ];
  const alphabetComplement = MAJUSCULES + MINUSCULES + CHIFFRES + SPECIAUX;
  const complement = tirer(alphabetComplement, longueur - obligatoires.length);
  return melanger([...obligatoires, ...complement]).join('');
}
