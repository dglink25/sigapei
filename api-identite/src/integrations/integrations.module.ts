import { Module } from '@nestjs/common';
import { ConvessaProvider } from './whatsapp/convessa.provider';
import { SmsGatewayMaisonProvider } from './sms/sms-gateway-maison.provider';
import { SmtpAppPasswordProvider } from './email/smtp-app-password.provider';
import { FirebaseAdminProvider } from './firebase/firebase-admin.provider';
import { RecaptchaProvider } from './captcha/recaptcha.provider';

@Module({
  providers: [
    ConvessaProvider,
    SmsGatewayMaisonProvider,
    SmtpAppPasswordProvider,
    FirebaseAdminProvider,
    RecaptchaProvider,
  ],
  exports: [
    ConvessaProvider,
    SmsGatewayMaisonProvider,
    SmtpAppPasswordProvider,
    FirebaseAdminProvider,
    RecaptchaProvider,
  ],
})
export class IntegrationsModule {}
