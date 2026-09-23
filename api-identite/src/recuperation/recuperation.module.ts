import { Module } from '@nestjs/common';
import { RecuperationService } from './recuperation.service';
import { RecuperationController } from './recuperation.controller';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { OtpModule } from '../otp/otp.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [UtilisateursModule, OtpModule, IntegrationsModule, AuditModule],
  controllers: [RecuperationController],
  providers: [RecuperationService],
})
export class RecuperationModule {}
