import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';
import { PermissionsRoleService } from './permissions-role.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class DefinirAccesRoleServiceDto {
  @IsBoolean() accorde: boolean;
}
class DefinirAccesPortailDto {
  @IsBoolean() peutVoirPortail: boolean;
}

@ApiTags('Accès aux services')
@ApiBearerAuth()
@Roles('administrateur')
@Controller('permissions-roles')
export class PermissionsRoleController {
  constructor(private readonly service: PermissionsRoleService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les rôles de mon établissement avec leurs services accordés et accès portail.' })
  listerRoles(@CurrentUser('sub') acteur: string) {
    return this.service.listerRolesAvecDroits(acteur);
  }

  @Get(':roleUuid/services')
  @ApiOperation({ summary: 'Services accordés à un rôle dans mon établissement.' })
  droitsRoleSurServices(
    @CurrentUser('sub') acteur: string,
    @Param('roleUuid', ParseUUIDPipe) roleUuid: string,
  ) {
    return this.service.droitsRoleSurServices(acteur, roleUuid);
  }

  @Put(':roleUuid/services/:serviceUuid')
  @ApiOperation({ summary: 'Accorde ou révoque l\'accès d\'un rôle à un service.' })
  definirAccesService(
    @CurrentUser('sub') acteur: string,
    @Param('roleUuid', ParseUUIDPipe) roleUuid: string,
    @Param('serviceUuid', ParseUUIDPipe) serviceUuid: string,
    @Body() dto: DefinirAccesRoleServiceDto,
  ) {
    return this.service.definirAccesRoleService(acteur, roleUuid, serviceUuid, dto.accorde);
  }

  @Put(':roleUuid/portail')
  @ApiOperation({ summary: 'Active ou désactive l\'accès au portail pour un rôle.' })
  definirAccesPortail(
    @CurrentUser('sub') acteur: string,
    @Param('roleUuid', ParseUUIDPipe) roleUuid: string,
    @Body() dto: DefinirAccesPortailDto,
  ) {
    return this.service.definirAccesPortail(acteur, roleUuid, dto.peutVoirPortail);
  }
}
