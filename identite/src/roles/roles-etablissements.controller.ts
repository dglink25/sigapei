/**
 * RolesEtablissementsController
 *
 * Préfixe dédié /roles-etablissements (miroir de /services-etablissements).
 * Zéro conflit de routes avec /roles.
 *
 * Routes super_admin :
 *   POST   /roles-etablissements                        - assigner un rôle à N établissements
 *   GET    /roles-etablissements/roles/:roleUuid        - établissements d'un rôle
 *   GET    /roles-etablissements/etablissements/:uuid   - rôles d'un établissement
 *   DELETE /roles-etablissements/:assignationUuid       - retirer un rôle d'un établissement
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import { DemandesRoleService } from './demandes-role.service';
import { Roles } from '../common/decorators/roles.decorator';

class AssignerRoleEtablissementsDto {
  @IsUUID('4') roleUuid: string;
  @IsArray() @IsUUID('4', { each: true }) etablissementUuids: string[];
}

@ApiTags('Rôles - Assignations')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('roles-etablissements')
export class RolesEtablissementsController {
  constructor(private readonly service: DemandesRoleService) {}

  /** Résumé du nombre de rôles personnalisés par établissement (non bloquant). */
  @Get('resume')
  @ApiOperation({ summary: 'Nombre de rôles personnalisés par établissement (tableau de bord).' })
  resume() {
    return this.service.resumeRolesParEtablissement();
  }

  /** Assigner un rôle à un ou plusieurs établissements. */
  @Post()
  @ApiOperation({ summary: 'Assigne un rôle à N établissements (sélection visuelle).' })
  assigner(@Body() dto: AssignerRoleEtablissementsDto) {
    return this.service.assignerRoleAuxEtablissements(dto.roleUuid, dto.etablissementUuids ?? []);
  }

  /** Établissements qui ont accès à un rôle. */
  @Get('roles/:roleUuid')
  @ApiOperation({ summary: 'Établissements ayant accès à ce rôle.' })
  etablissementsParRole(@Param('roleUuid', ParseUUIDPipe) roleUuid: string) {
    return this.service.listerEtablissementsParRole(roleUuid);
  }

  /** Rôles assignés à un établissement (personnalisés + système utilisés). */
  @Get('etablissements/:etablissementUuid')
  @ApiOperation({ summary: 'Rôles d\'un établissement (personnalisés assignés + système utilisés).' })
  rolesParEtablissement(@Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string) {
    return this.service.listerRolesParEtablissement(etablissementUuid);
  }

  /** Retirer un rôle d'un établissement (cascade utilisateurs). */
  @Delete(':assignationUuid')
  @ApiOperation({ summary: 'Retire un rôle d\'un établissement. Les utilisateurs sont réattribués au rôle Personnel.' })
  retirerRole(@Param('assignationUuid', ParseUUIDPipe) assignationUuid: string) {
    return this.service.retirerRoleDEtablissement(assignationUuid);
  }
}
