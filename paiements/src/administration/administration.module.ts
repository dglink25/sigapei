import { Module } from '@nestjs/common';
import { AdministrationService } from './administration.service';
import { AdministrationController } from './administration.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { JwtGuard } from '../common/guards/jwt.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [AdministrationService, SuperAdminService, JwtGuard, SuperAdminGuard],
  controllers: [AdministrationController, SuperAdminController],
  exports: [AdministrationService, SuperAdminService],
})
export class AdministrationModule {}
