import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import { BadRequestException } from '@nestjs/common';

const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Normalise un numero de telephone saisi (avec indicatif pays ISO2 optionnel)
 * vers le format international E.164, conformement a la section 5 du cahier des charges.
 */
export function normaliserTelephoneE164(rawNumber: string, defaultRegion = 'BJ'): { e164: string; pays: string } {
  try {
    const parsed = phoneUtil.parseAndKeepRawInput(rawNumber, defaultRegion);
    if (!phoneUtil.isValidNumber(parsed)) {
      throw new Error('invalide');
    }
    const e164 = phoneUtil.format(parsed, PhoneNumberFormat.E164);
    const regionCode = phoneUtil.getRegionCodeForNumber(parsed) ?? defaultRegion;
    return { e164, pays: regionCode };
  } catch {
    throw new BadRequestException({
      code: 'TELEPHONE_INVALIDE',
      message: "Le numero de telephone saisi n'est pas valide.",
    });
  }
}
