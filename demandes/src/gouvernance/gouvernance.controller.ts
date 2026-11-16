import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Utilisateur, UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { avecMessage } from '../common/filtres/reponse.interceptor';
import { DefinirPermissionsDto } from './dto/definir-permissions.dto';
import { GouvernanceService } from './gouvernance.service';

@ApiTags('Gouvernance du module')
@ApiBearerAuth()
@Controller('gouvernance')
export class GouvernanceController {
  constructor(private readonly gouvernance: GouvernanceService) {}

  @Get('mes-actions')
  @ApiOperation({
    summary: "Actions de gestion de l'utilisateur connecte (pour adapter l'interface).",
  })
  async mesActions(@Utilisateur() u: UtilisateurCourant) {
    return {
      role_code: u.roleCode,
      actions: await this.gouvernance.mesActions(u),
    };
  }

  @Get('permissions')
  @ApiOperation({
    summary: "Grille role x action de l'etablissement (administrateur).",
  })
  async grille(@Utilisateur() u: UtilisateurCourant) {
    this.gouvernance.exigerAdministrateur(u);
    return this.gouvernance.grille(u);
  }

  @Put('permissions/:role_code')
  @ApiOperation({
    summary: 'Remplace les actions accordees a un role (administrateur uniquement, journalise).',
  })
  async definir(@Utilisateur() u: UtilisateurCourant, @Param('role_code') roleCode: string, @Body() dto: DefinirPermissionsDto) {
    return avecMessage('Permissions du rôle enregistrées.', await this.gouvernance.definir(u, roleCode, dto));
  }
}
