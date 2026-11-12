import { Module } from '@nestjs/common';
import { DecaissementService } from './decaissement.service';
import { DecaissementController } from './decaissement.controller';
import { AuditModule } from '../audit/audit.module';
import { AgregateurModule } from '../agregateurs/agregateurs.module';
import { SecuriteModule } from '../common/securite/securite.module';

@Module({
  imports: [AgregateurModule, AuditModule, SecuriteModule],
  providers: [DecaissementService],
  controllers: [DecaissementController],
  exports: [DecaissementService],
})
export class DecaissementModule {}
