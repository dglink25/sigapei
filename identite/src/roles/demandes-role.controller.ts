import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, Length, MinLength } from 'class-validator';
import { DemandesRoleService } from './demandes-role.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class SoumettreDemandeRoleDto {
  @IsString() @Length(2, 128) nomSouhaite: string;
  @IsString() @MinLength(20) description: string;
}

class AccepterDemandeRoleDto {
  @IsString() @Length(2, 128) libelle: string;
  @IsOptional() @IsString() familleAuth?: string;
  @IsArray() @IsUUID('4', { each: true }) etablissementUuids: string[];
  @IsOptional() @IsString() note?: string;
}

class RefuserDemandeRoleDto {
  @IsString() @MinLength(10) note: string;
}

class AssignerRoleEtablissementsDto {
  @IsArray() @IsUUID('4', { each: true }) etablissementUuids: string[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class DemandesRoleController {
  constructor(private readonly service: DemandesRoleService) {}

  // ── Côté admin établissement ─────────────────────────────────────────

  @Get('mes-demandes')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Liste mes demandes de rôle personnalisé.' })
  mesDemandes(@CurrentUser('tenantId') tenantId: string) {
    return this.service.mesDemandes(tenantId);
  }

  @Post('demandes')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Soumet une demande de rôle personnalisé au Super Administrateur.' })
  soumettre(@CurrentUser('tenantId') tenantId: string, @Body() dto: SoumettreDemandeRoleDto) {
    return this.service.soumettre(tenantId, dto.nomSouhaite, dto.description);
  }

  @Delete('demandes/:uuid')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Annule une demande en attente.' })
  annuler(@CurrentUser('tenantId') tenantId: string, @Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.service.annuler(tenantId, uuid);
  }

  // ── Côté super admin ──────────────────────────────────────────────────

  @Get('demandes')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Liste toutes les demandes de rôle (filtrables par statut).' })
  toutesLesDemandes(@Query('statut') statut?: string) {
    return this.service.toutesLesDemandes(statut ?? 'en_attente');
  }

  @Post('demandes/:uuid/accepter')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Accepte une demande : crée le rôle et l\'assigne aux établissements sélectionnés.' })
  accepter(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: AccepterDemandeRoleDto) {
    return this.service.accepter(uuid, {
      libelle:          dto.libelle,
      familleAuth:      dto.familleAuth,
      etablissementIds: dto.etablissementUuids,
      note:             dto.note ?? '',
    });
  }

  @Post('demandes/:uuid/refuser')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Refuse une demande avec une note obligatoire.' })
  refuser(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: RefuserDemandeRoleDto) {
    return this.service.refuser(uuid, dto.note);
  }

  // ── Assignations rôle ↔ établissements ──────────────────────────────

  @Get(':uuid/etablissements')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Établissements ayant accès à ce rôle personnalisé.' })
  etablissementsParRole(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.service.listerEtablissementsParRole(uuid);
  }

  @Post(':uuid/etablissements')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Assigne ce rôle à des établissements (sélection visuelle).' })
  assigner(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: AssignerRoleEtablissementsDto) {
    return this.service.assignerRoleAuxEtablissements(uuid, dto.etablissementUuids ?? []);
  }

  @Delete('etablissements/:assignationUuid')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Retire un rôle d\'un établissement (par uuid de l\'assignation).' })
  retirerRole(@Param('assignationUuid', ParseUUIDPipe) assignationUuid: string) {
    return this.service.retirerRoleDEtablissement(assignationUuid);
  }

  @Get('etablissements/:etablissementUuid/roles')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Rôles personnalisés assignés à un établissement.' })
  rolesParEtablissement(@Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string) {
    return this.service.listerRolesParEtablissement(etablissementUuid);
  }
}
