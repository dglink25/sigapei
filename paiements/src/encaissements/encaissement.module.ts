import { Module } from '@nestjs/common';
import { EncaissementService } from './encaissement.service';
import { EncaissementController } from './encaissement.controller';
import { WebhookController } from './webhook.controller';
import { AuditModule } from '../audit/audit.module';
import { AgregateurModule } from '../agregateurs/agregateurs.module';
import { SecuriteModule } from '../common/securite/securite.module';

@Module({
  imports: [AgregateurModule, AuditModule, SecuriteModule],
  providers: [EncaissementService],
  controllers: [EncaissementController, WebhookController],
  exports: [EncaissementService],
})
export class EncaissementModule {}
