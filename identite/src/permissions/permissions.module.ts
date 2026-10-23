import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionRole } from './permission-role.entity';
import { Role } from '../roles/role.entity';
import { Service } from '../services/service.entity';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { RolePermissionsController } from './role-permissions.controller';
import { InternePermissionsController } from './interne-permissions.controller';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { AccesCacheModule } from '../acces-services/acces-cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionRole, Role, Service]), AccesCacheModule],
  controllers: [PermissionsController, RolePermissionsController, InternePermissionsController],
  providers: [PermissionsService, InternalSecretGuard],
  exports: [PermissionsService],
})
export class PermissionsModule {}
