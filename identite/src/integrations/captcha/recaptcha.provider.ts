import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Vérification reCAPTCHA Enterprise côté serveur.
 * Appelle l'API Assessment de Google Cloud reCAPTCHA Enterprise.
 * Doc : https://cloud.google.com/recaptcha/docs/create-assessment
 */
@Injectable()
export class RecaptchaProvider {
  private readonly logger = new Logger(RecaptchaProvider.name);

  constructor(private readonly config: ConfigService) {}

  async verifier(token: string, action = 'submit'): Promise<void> {
    // Bypass de test uniquement hors production
    if (this.config.get('nodeEnv') !== 'production' && token === 'test-bypass') {
      return;
    }

    if (!token) {
      throw new UnauthorizedException({
        code: 'CAPTCHA_INVALIDE',
        message: 'La vérification anti-robot a échoué, veuillez réessayer.',
      });
    }

    const apiKey    = this.config.get<string>('captcha.apiKey');
    const siteKey   = this.config.get<string>('captcha.siteKey');
    const projectId = this.config.get<string>('captcha.projectId');
    const minScore  = this.config.get<number>('captcha.minScore') ?? 0.5;

    // Si pas configuré en dev → laisser passer avec avertissement
    if (!apiKey || !siteKey || !projectId) {
      this.logger.warn('reCAPTCHA Enterprise non configuré (RECAPTCHA_API_KEY / RECAPTCHA_SITE_KEY / RECAPTCHA_PROJECT_ID manquants)');
      if (this.config.get('nodeEnv') === 'production') {
        throw new UnauthorizedException({
          code: 'CAPTCHA_INVALIDE',
          message: 'La vérification anti-robot a échoué, veuillez réessayer.',
        });
      }
      return;
    }

    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

    try {
      const { data } = await axios.post(url, {
        event: {
          token,
          siteKey,
          expectedAction: action,
        },
      });

      const tokenProperties = data.tokenProperties ?? {};
      if (!tokenProperties.valid) {
        const raison = tokenProperties.invalidReason ?? 'inconnue';
        this.logger.warn(`reCAPTCHA token invalide, raison: ${raison}`);
        throw new Error(`token invalide: ${raison}`);
      }

      const score: number = data.riskAnalysis?.score ?? 0;
      if (score < minScore) {
        this.logger.warn(`reCAPTCHA score trop bas: ${score} < ${minScore}`);
        throw new Error(`score insuffisant: ${score}`);
      }
    } catch (err) {
      this.logger.warn(`Échec vérification reCAPTCHA Enterprise: ${(err as Error).message}`);
      throw new UnauthorizedException({
        code: 'CAPTCHA_INVALIDE',
        message: 'La vérification anti-robot a échoué, veuillez réessayer.',
      });
    }
  }
}
