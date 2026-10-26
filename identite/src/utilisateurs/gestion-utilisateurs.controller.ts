/**
 * GestionUtilisateursController
 *
 * Routes sous /v1/utilisateurs :
 *   GET    /utilisateurs              → liste (admin : son tenant ; super_admin : par ?tenantId=)
 *   POST   /utilisateurs              → créer un utilisateur
 *   GET    /utilisateurs/:uuid        → détail
 *   PATCH  /utilisateurs/:uuid/role   → changer le rôle
 *   PATCH  /utilisateurs/:uuid/statut → bloquer / archiver
 *
 * Accès :
 *   - super_admin  : accès total (doit passer ?tenantId= pour les opérations sur un tenant)
 *   - administrateur : uniquement les utilisateurs de son propre établissement
 */
import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GestionUtilisateursService, ActeurGestion } from './gestion-utilisateurs.service';
import { AssignerRoleDto } from './dto/assigner-role.dto';
import { CreerUtilisateurDto } from './dto/creer-utilisateur.dto';
import { StatutUtilisateur } from './utilisateur.entity';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Roles('administrateur', 'super_admin')
@Controller('utilisateurs')
export class GestionUtilisateursController {
  constructor(private readonly service: GestionUtilisateursService) {}

  private acteur(user: { roleCode: string; tenantId: string | null; sub: string }): ActeurGestion {
    return { roleCode: user.roleCode, tenantId: user.tenantId, utilisateurUuid: user.sub };
  }

  @Get()
  @ApiOperation({ summary: 'Liste les utilisateurs. Admin : son établissement. Super_admin : tous ou filtré.' })
  lister(
    @CurrentUser() user: any,
    @Query('tenantId') tenantId?: string,
    @Query('q') q?: string,
    @Query('roleCode') roleCode?: string,
    @Query('annee') annee?: string,
    @Query('nomEtablissement') nomEtablissement?: string,
    @Query('page') page?: number,
    @Query('limite') limite?: number,
  ) {
    const acteur: ActeurGestion = {
      roleCode: user.roleCode,
      tenantId: user.tenantId,
      utilisateurUuid: user.sub,
    };
    return this.service.lister(acteur, { q, roleCode, tenantId, annee, nomEtablissement, page, limite });
  }

  @Post()
  @ApiOperation({ summary: 'Crée un utilisateur dans un établissement.' })
  creer(@CurrentUser() user: any, @Body() dto: CreerUtilisateurDto) {
    return this.service.creer(this.acteur(user), dto);
  }

  @Get(':uuid')
  @ApiOperation({ summary: "Détail d'un utilisateur." })
  obtenir(@CurrentUser() user: any, @Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.service.obtenir(this.acteur(user), uuid);
  }

  @Patch(':uuid/role')
  @ApiOperation({
    summary: "Assigne un rôle à un utilisateur. "
      + "L'admin peut assigner des rôles globaux ou de son tenant (jamais super_admin). "
      + "Le super_admin peut assigner n'importe quel rôle non super_admin.",
  })
  assignerRole(
    @CurrentUser() user: any,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: AssignerRoleDto,
  ) {
    return this.service.assignerRole(this.acteur(user), uuid, dto.roleUuid);
  }

  @Patch(':uuid/statut')
  @ApiOperation({ summary: 'Modifie le statut (actif, bloque, archive).' })
  modifierStatut(
    @CurrentUser() user: any,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body('statut') statut: StatutUtilisateur,
  ) {
    return this.service.modifierStatut(this.acteur(user), uuid, statut);
  }
}
