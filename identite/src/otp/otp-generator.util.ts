import * as crypto from 'crypto';

/**
 * Genere un code OTP numerique a 6 chiffres (canal telephone : SMS/WhatsApp),
 * via un generateur cryptographiquement sur (section 6.1).
 */
export function genererOtpTelephone(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Genere un code OTP numerique a 6 chiffres pour le canal e-mail.
 * Format uniforme avec le canal telephone : le frontend attend systematiquement
 * un code a 6 chiffres (input maxLength=6, regex /^\d{6}$/).
 * Le parametre `longueur` est conserve pour compatibilite mais ignore (toujours 6).
 */
export function genererOtpEmail(_longueur = 6): string {
  return genererOtpTelephone();
}
