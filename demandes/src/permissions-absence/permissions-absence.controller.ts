import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Utilisateur, UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { avecMessage } from '../common/filtres/reponse.interceptor';
import { DeciderPermissionDto, FiltresPermissionsDto, SoumettrePermissionDto } from './dto/permissions.dto';
import { PermissionsAbsenceService } from './permissions-absence.service';

const Uuid = new ParseUUIDPipe({
  exceptionFactory: () => ErreurMetier.introuvable(),
});

@ApiTags("Permissions d'absence")
@ApiBearerAuth()
@Controller('permissions-absence')
export class PermissionsAbsenceController {
  constructor(private readonly permissions: PermissionsAbsenceService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Demande une permission d'absence pour soi ou pour un enfant rattache.",
  })
  async soumettre(@Utilisateur() u: UtilisateurCourant, @Body() dto: SoumettrePermissionDto) {
    return avecMessage("Demande de permission envoyée à l'établissement.", await this.permissions.soumettre(u, dto));
  }

  @Get('mes-demandes')
  @ApiOperation({
    summary: "Permissions demandees par l'utilisateur connecte.",
  })
  miennes(@Utilisateur() u: UtilisateurCourant, @Query() f: FiltresPermissionsDto) {
    return this.permissions.lister(u, f, true);
  }

  @Get()
  @ApiOperation({
    summary: "File des permissions (permission valider_permission_absence) : en attente d'abord.",
  })
  file(@Utilisateur() u: UtilisateurCourant, @Query() f: FiltresPermissionsDto) {
    return this.permissions.lister(u, f, false);
  }

  @Get(':uuid')
  consulter(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return this.permissions.consulter(u, uuid);
  }

  @Put(':uuid/decision')
  @ApiOperation({ summary: 'Valide ou rejette (motif obligatoire si rejet).' })
  async decider(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: DeciderPermissionDto) {
    const p = await this.permissions.decider(u, uuid, dto);
    return avecMessage(
      p.statut === 'validee' ? 'Permission validée : la famille est notifiée.' : 'Permission refusée : la famille est notifiée.',
      p,
    );
  }

  @Post(':uuid/annuler')
  @HttpCode(200)
  async annuler(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return avecMessage('Demande de permission annulée.', await this.permissions.annuler(u, uuid));
  }
}
