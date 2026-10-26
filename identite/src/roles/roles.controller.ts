import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActeurRole, RolesService } from './roles.service';
import { CreerRoleDto } from './dto/creer-role.dto';
import { ModifierRoleDto } from './dto/modifier-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: "Liste les roles disponibles. Super admin : tous les rôles (filtrables par tenantId). Admin établissement : uniquement les rôles assignés à son établissement." })
  async lister(@CurrentUser() acteur: ActeurRole, @Query('tenantId', new ParseUUIDPipe({ optional: true })) tenantId?: string) {
    if (acteur.roleCode === 'super_admin') {
      // Super admin : tous les rôles, optionnellement filtrés par tenant
      return { roles: await this.rolesService.lister(tenantId) };
    }
    if (acteur.tenantId) {
      // Admin établissement : uniquement les rôles assignés à son établissement
      return { roles: await this.rolesService.listerPourEtablissement(acteur.tenantId) };
    }
    return { roles: [] };
  }

  @Post()
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: "Cree un role personnalise (administrateur : pour son etablissement uniquement)." })
  creer(@Body() dto: CreerRoleDto, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.creer(dto, acteur);
  }

  @Put(':uuid')
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: "Modifie le libelle ou la famille d'authentification d'un role personnalise de votre etablissement." })
  modifier(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: ModifierRoleDto, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.modifier(uuid, dto, acteur);
  }

  @Delete(':uuid')
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: 'Supprime un role personnalise de votre etablissement non utilise par un compte.' })
  desactiver(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.desactiver(uuid, acteur).then(() => ({ code: 'ROLE_DESACTIVE' }));
  }
}
