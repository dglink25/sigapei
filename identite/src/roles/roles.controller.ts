import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActeurRole, RolesService } from './roles.service';
import { CreerRoleDto } from './dto/creer-role.dto';
import { ModifierRoleDto } from './dto/modifier-role.dto';
import { ListerRolesDto } from './dto/lister-roles.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginee des roles visibles (systeme + personnalises de votre etablissement ; filtres : q, familleAuth). Le super_admin peut cibler un etablissement via tenantId.',
  })
  lister(@Query() dto: ListerRolesDto, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.lister(dto, acteur);
  }

  @Post()
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: "Cree un role personnalise (administrateur : pour son etablissement uniquement)." })
  creer(@Body() dto: CreerRoleDto, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.creer(dto, acteur);
  }

  @Get(':uuid')
  @ApiOperation({ summary: "Detail d'un role." })
  obtenir(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.obtenir(uuid, acteur);
  }

  @Put(':uuid')
  @Roles('administrateur', 'super_admin')
  @ApiOperation({
    summary: "Modifie le libelle ou la famille d'authentification d'un role personnalise (le code et le tenant sont immuables).",
  })
  modifier(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: ModifierRoleDto, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.modifier(uuid, dto, acteur);
  }

  @Delete(':uuid')
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: 'Supprime un role personnalise de votre etablissement non utilise par un compte.' })
  supprimer(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() acteur: ActeurRole) {
    return this.rolesService.supprimer(uuid, acteur).then(() => ({ code: 'ROLE_SUPPRIME' }));
  }
}
