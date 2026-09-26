import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OtpService } from './otp.service';

@Module({
  imports: [IntegrationsModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
