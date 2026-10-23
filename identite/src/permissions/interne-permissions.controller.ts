import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { PermissionsService } from './permissions.service';

/**
 * Matrice d'un role pour les autres microservices : GET /interne/permissions-role/{roleUuid}
 * (CDC section 5.3 + 19.5 — consomme par demandes et finances, qui n'ont jamais de jointure
 * inter-schemas). Protegee par X-Internal-Secret, hors limitation de debit (machine a machine).
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@UseGuards(InternalSecretGuard)
@Controller('interne')
export class InternePermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get('permissions-role/:roleUuid')
  async permissionsRole(@Param('roleUuid', ParseUUIDPipe) roleUuid: string) {
    return this.permissions.listerPourRole(roleUuid);
  }
}
