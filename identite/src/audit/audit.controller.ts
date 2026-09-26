import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit (interne)')
@ApiBearerAuth()
@Controller('interne/tentatives')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: 'Journal des tentatives de connexion, filtre par tenant (back-office).' })
  lister(@Query('tenantId') tenantId: string, @Query('limite') limite?: string) {
    return this.auditService.listerParTenant(tenantId, limite ? parseInt(limite, 10) : undefined);
  }
}
