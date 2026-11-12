import { Module } from '@nestjs/common';
import { AdministrationService } from './administration.service';
import { AdministrationController } from './administration.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [AdministrationService],
  controllers: [AdministrationController],
  exports: [AdministrationService],
})
export class AdministrationModule {}
