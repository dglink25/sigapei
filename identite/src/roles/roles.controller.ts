import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreerRoleDto } from './dto/creer-role.dto';
import { ModifierRoleDto } from './dto/modifier-role.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les roles disponibles (systeme + personnalises) pour le tenant courant.' })
  lister(@Query('tenantId') tenantId?: string) {
    return this.rolesService.lister(tenantId);
  }

  @Post()
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: 'Cree un role personnalise, reserve Administrateur/Super Administrateur.' })
  creer(@Body() dto: CreerRoleDto) {
    return this.rolesService.creer(dto);
  }

  @Put(':uuid')
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: "Modifie le libelle ou la famille d'authentification d'un role personnalise." })
  modifier(@Param('uuid') uuid: string, @Body() dto: ModifierRoleDto) {
    return this.rolesService.modifier(uuid, dto);
  }

  @Delete(':uuid')
  @Roles('administrateur', 'super_admin')
  @ApiOperation({ summary: 'Desactive un role personnalise non utilise par un compte actif.' })
  desactiver(@Param('uuid') uuid: string) {
    return this.rolesService.desactiver(uuid).then(() => ({ code: 'ROLE_DESACTIVE' }));
  }
}
