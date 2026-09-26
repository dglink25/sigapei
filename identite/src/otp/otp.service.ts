import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { RedisService } from '../redis/redis.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { ConvessaProvider } from '../integrations/whatsapp/convessa.provider';
import { SmsGatewayMaisonProvider } from '../integrations/sms/sms-gateway-maison.provider';
import { SmtpAppPasswordProvider } from '../integrations/email/smtp-app-password.provider';
import { genererOtpEmail, genererOtpTelephone } from './otp-generator.util';
import { CanalOtp, OtpEnregistre } from './otp.types';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitmqService,
    private readonly convessa: ConvessaProvider,
    private readonly smsGateway: SmsGatewayMaisonProvider,
    private readonly smtp: SmtpAppPasswordProvider,
  ) {}

  private cleOtp(cible: string): string {
    return `otp:${cible}`;
  }

  private cleRenvoi(cible: string): string {
    return `otp:renvois:${cible}`;
  }

  /**
   * Verifie le quota de renvoi (3 par 10 min, avec delai progressif 30s/60s/120s
   * gere naturellement par l'expiration TTL de la cle "dernier envoi").
   */
  private async verifierQuotaRenvoi(cible: string): Promise<void> {
    const delaiCle = `otp:delai:${cible}`;
    const enAttente = await this.redis.ttl(delaiCle);
    if (enAttente > 0) {
      throw new HttpException(
        {
          code: 'OTP_DELAI_NON_ECOULE',
          message: `Veuillez patienter ${enAttente} secondes avant de redemander un code.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const fenetre = this.config.get<number>('otp.resendWindowSeconds')!;
    const maxRenvois = this.config.get<number>('otp.maxResendsPerWindow')!;
    const nbRenvois = await this.redis.incrWithExpire(this.cleRenvoi(cible), fenetre);
    if (nbRenvois > maxRenvois) {
      throw new HttpException(
        {
          code: 'OTP_QUOTA_RENVOI_ATTEINT',
          message: 'Nombre maximal de renvois atteint, veuillez reessayer plus tard.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const delaisProgressifs = [30, 60, 120];
    const delai = delaisProgressifs[Math.min(nbRenvois - 1, delaisProgressifs.length - 1)];
    await this.redis.client.set(delaiCle, '1', 'EX', delai);
  }

  /**
   * Envoie un OTP par e-mail (format contraint : 12 caracteres, >=2 speciaux,
   * >=2 majuscules, >=2 minuscules).
   */
  async envoyerParEmail(utilisateurId: string, email: string): Promise<void> {
    await this.verifierQuotaRenvoi(email);
    const code = genererOtpEmail(12);
    await this.enregistrerOtp(email, code, CanalOtp.EMAIL, utilisateurId);
    const dureeMinutes = Math.round(this.config.get<number>('otp.ttlSeconds')! / 60);
    const envoye = await this.smtp.envoyerCodeOtp(email, code, dureeMinutes);
    if (!envoye) {
      throw new HttpException(
        { code: 'OTP_ENVOI_ECHOUE', message: "L'envoi du code par e-mail a echoue." },
        HttpStatus.BAD_GATEWAY,
      );
    }
    this.rabbitmq.publier('otp.envoye', { utilisateurId, canal: 'email', cible: this.masquer(email) });
  }

  /**
   * Envoie un OTP par telephone en parallele sur SMS (passerelle maison) et
   * WhatsApp (Convessa) - le premier canal qui aboutit fait foi (section 6.2).
   */
  async envoyerParTelephone(utilisateurId: string, telephoneE164: string): Promise<{ smsOk: boolean; whatsappOk: boolean }> {
    await this.verifierQuotaRenvoi(telephoneE164);
    const code = genererOtpTelephone();
    await this.enregistrerOtp(telephoneE164, code, 'sms+whatsapp' as any, utilisateurId);
    const dureeMinutes = Math.round(this.config.get<number>('otp.ttlSeconds')! / 60);

    const [sms, whatsapp] = await Promise.allSettled([
      this.smsGateway.envoyerCodeOtp(telephoneE164, code, dureeMinutes),
      this.convessa.envoyerCodeOtp(telephoneE164, code, dureeMinutes),
    ]);

    const smsOk = sms.status === 'fulfilled' && sms.value.succes;
    const whatsappOk = whatsapp.status === 'fulfilled' && whatsapp.value.succes;

    if (!smsOk && !whatsappOk) {
      throw new HttpException(
        { code: 'OTP_ENVOI_ECHOUE', message: "L'envoi du code a echoue sur les deux canaux (SMS et WhatsApp)." },
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.rabbitmq.publier('otp.envoye', {
      utilisateurId,
      canal: 'sms+whatsapp',
      cible: this.masquer(telephoneE164),
      smsOk,
      whatsappOk,
    });

    return { smsOk, whatsappOk };
  }

  private async enregistrerOtp(cible: string, code: string, canal: CanalOtp | 'sms+whatsapp', utilisateurId: string) {
    const codeHash = await argon2.hash(code);
    const enregistrement: OtpEnregistre = {
      codeHash,
      cible,
      canal,
      nbTentatives: 0,
      utilisateurId,
      creeLe: new Date().toISOString(),
    };
    const ttl = this.config.get<number>('otp.ttlSeconds')!;
    await this.redis.setJson(this.cleOtp(cible), enregistrement, ttl);
  }

  /**
   * Verifie un code OTP saisi. Le code est lie explicitement a sa cible
   * (numero ou e-mail) : un code emis pour un canal n'est jamais valide sur
   * un autre identifiant (section 6.1, regle 7).
   */
  async verifier(cible: string, codeSaisi: string): Promise<string> {
    const enregistrement = await this.redis.getJson<OtpEnregistre>(this.cleOtp(cible));
    if (!enregistrement) {
      throw new BadRequestException({
        code: 'OTP_EXPIRE_OU_INTROUVABLE',
        message: 'Le code a expire ou est introuvable, veuillez en redemander un.',
      });
    }

    const maxTentatives = this.config.get<number>('otp.maxAttempts')!;
    if (enregistrement.nbTentatives >= maxTentatives) {
      await this.redis.del(this.cleOtp(cible));
      throw new BadRequestException({
        code: 'OTP_TENTATIVES_EPUISEES',
        message: 'Nombre maximal de tentatives atteint, veuillez redemander un code.',
      });
    }

    const valide = await argon2.verify(enregistrement.codeHash, codeSaisi);
    if (!valide) {
      enregistrement.nbTentatives += 1;
      const ttlRestant = await this.redis.ttl(this.cleOtp(cible));
      await this.redis.setJson(this.cleOtp(cible), enregistrement, ttlRestant > 0 ? ttlRestant : undefined);
      throw new BadRequestException({
        code: 'OTP_INCORRECT',
        message: `Code incorrect (${enregistrement.nbTentatives}/${maxTentatives} tentatives).`,
      });
    }

    // Usage unique : suppression immediate apres succes.
    await this.redis.del(this.cleOtp(cible));
    return enregistrement.utilisateurId;
  }

  private masquer(cible: string): string {
    if (cible.includes('@')) {
      const [nom, domaine] = cible.split('@');
      return `${nom.slice(0, 2)}${'*'.repeat(Math.max(nom.length - 2, 1))}@${domaine}`;
    }
    return `${cible.slice(0, 4)}${'*'.repeat(Math.max(cible.length - 6, 2))}${cible.slice(-2)}`;
  }
}
