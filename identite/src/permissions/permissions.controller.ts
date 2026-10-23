import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActeurRole } from '../roles/roles.service';
import { PermissionsService } from './permissions.service';
import { CreerPermissionDto } from './dto/creer-permission.dto';
import { ModifierPermissionDto } from './dto/modifier-permission.dto';
import { ListerPermissionsDto } from './dto/lister-permissions.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@Roles('administrateur', 'super_admin')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginee des permissions (filtres : roleUuid, serviceUuid, action, autorise, q).' })
  lister(@Query() dto: ListerPermissionsDto, @CurrentUser() acteur: ActeurRole) {
    return this.permissions.lister(dto, acteur);
  }

  @Post()
  @ApiOperation({ summary: 'Accorde ou refuse une action a un role sur un service (matrice role x service x action).' })
  creer(@Body() dto: CreerPermissionDto, @CurrentUser() acteur: ActeurRole) {
    return this.permissions.creer(dto, acteur);
  }

  @Get(':uuid')
  @ApiOperation({ summary: "Detail d'une permission." })
  obtenir(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() acteur: ActeurRole) {
    return this.permissions.obtenir(uuid, acteur);
  }

  @Put(':uuid')
  @ApiOperation({ summary: "Modifie l'action ou le sens d'une permission (role et service immuables)." })
  modifier(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: ModifierPermissionDto,
    @CurrentUser() acteur: ActeurRole,
  ) {
    return this.permissions.modifier(uuid, dto, acteur);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: "Retire une permission (l'action redevient non definie pour ce role et ce service)." })
  supprimer(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser() acteur: ActeurRole) {
    return this.permissions.supprimer(uuid, acteur);
  }
}
