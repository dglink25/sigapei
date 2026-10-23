import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActeurRole } from '../roles/roles.service';
import { PermissionsService } from './permissions.service';
import { RemplacerPermissionsRoleDto } from './dto/remplacer-permissions-role.dto';

/** Matrice de permissions d'un role : lecture et remplacement en bloc (onglet "Roles" de l'administration). */
@ApiTags('Permissions')
@ApiBearerAuth()
@Roles('administrateur', 'super_admin')
@Controller('roles')
export class RolePermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get(':roleUuid/permissions')
  @ApiOperation({ summary: "Permissions accordees a un role, tous services confondus." })
  lister(@Param('roleUuid', ParseUUIDPipe) roleUuid: string, @CurrentUser() acteur: ActeurRole) {
    return this.permissions.listerPourRole(roleUuid, acteur);
  }

  @Put(':roleUuid/permissions')
  @ApiOperation({ summary: "Remplace la matrice d'un role (1 a 500 lignes ; les lignes absentes sont supprimees)." })
  remplacer(
    @Param('roleUuid', ParseUUIDPipe) roleUuid: string,
    @Body() dto: RemplacerPermissionsRoleDto,
    @CurrentUser() acteur: ActeurRole,
  ) {
    return this.permissions.remplacerPourRole(roleUuid, dto, acteur);
  }
}
