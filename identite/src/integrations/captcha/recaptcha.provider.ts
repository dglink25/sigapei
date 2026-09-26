import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Verification CAPTCHA (reCAPTCHA v3 ou hCaptcha) sur tout formulaire public
 * (identification, envoi d'OTP, recuperation d'identifiant), conformement
 * a la section 9 du cahier des charges.
 */
@Injectable()
export class RecaptchaProvider {
  private readonly logger = new Logger(RecaptchaProvider.name);

  constructor(private readonly config: ConfigService) {}

  async verifier(token: string): Promise<void> {
    if (this.config.get('nodeEnv') !== 'production' && token === 'test-bypass') {
      return; // Bascule de test en local/dev uniquement.
    }
    const provider = this.config.get<string>('captcha.provider');
    const secret = this.config.get<string>('captcha.secretKey');
    const scoreMinimal = this.config.get<number>('captcha.minScore') ?? 0.5;
    const url =
      provider === 'hcaptcha'
        ? 'https://hcaptcha.com/siteverify'
        : 'https://www.google.com/recaptcha/api/siteverify';

    try {
      const { data } = await axios.post(url, null, {
        params: { secret, response: token },
      });
      const score = data.score ?? 1;
      if (!data.success || score < scoreMinimal) {
        throw new Error('score insuffisant');
      }
    } catch (err) {
      this.logger.warn(`Echec verification CAPTCHA: ${(err as Error).message}`);
      throw new UnauthorizedException({
        code: 'CAPTCHA_INVALIDE',
        message: 'La verification anti-robot a echoue, veuillez reessayer.',
      });
    }
  }
}