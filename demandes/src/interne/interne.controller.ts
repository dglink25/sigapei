import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { SansContexteUtilisateur } from '../common/decorators/public.decorator';

/**
 * Endpoints internes - consommes via X-Internal-Secret.
 * CDC section 17.
 *
 * /interne/permission-active/{apprenant_uuid} : consomme par Vie scolaire
 *   pour qualifier automatiquement les absences (CDC section 19.7).
 * /interne/permissions-role/{role_uuid} : consomme par Identite pour
 *   resoudre les permissions d'un role (CDC section 19.5).
 */
@ApiExcludeController()
@SansContexteUtilisateur()
@UseGuards(InternalSecretGuard)
@Controller('interne')
export class InterneController {
  
  @Get('permission-active/:apprenant_uuid')
  async permissionActive(
    @Param('apprenant_uuid') apprenantUuid: string,
    @Query('date') date: string,
  ) {
    // TODO : chercher une permission validee couvrant la date fournie,
    // retourner { permissionnaire: boolean, permission_uuid?: string }
    return { message: 'Non implemente' };
  }

 
  @Get('permissions-role/:role_uuid')
  async permissionsRole(@Param('role_uuid') roleUuid: string) {
    // TODO : interroger identite.role_permissions pour ce role et le module "demandes"
    return { message: 'Non implemente' };
  }
}
