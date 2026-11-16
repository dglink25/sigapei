import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Utilisateur, UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { avecMessage } from '../common/filtres/reponse.interceptor';
import {
  FiltresReclamationsDto,
  MessageDto,
  OuvrirReclamationDto,
  OuvrirVersUsagerDto,
  StatutReclamationDto,
} from './dto/reclamations.dto';
import { ReclamationsService } from './reclamations.service';

const Uuid = new ParseUUIDPipe({
  exceptionFactory: () => ErreurMetier.introuvable(),
});

@ApiTags('Reclamations')
@ApiBearerAuth()
@Controller('reclamations')
export class ReclamationsController {
  constructor(private readonly reclamations: ReclamationsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ouvre une reclamation (tout profil).' })
  async ouvrir(@Utilisateur() u: UtilisateurCourant, @Body() dto: OuvrirReclamationDto) {
    return avecMessage("Réclamation envoyée à l'établissement.", await this.reclamations.ouvrir(u, dto));
  }

  @Post('vers-usager')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: "L'etablissement ouvre un echange vers un usager (permission repondre_reclamation).",
  })
  async ouvrirVersUsager(@Utilisateur() u: UtilisateurCourant, @Body() dto: OuvrirVersUsagerDto) {
    return avecMessage('Message envoyé.', await this.reclamations.ouvrirVersUsager(u, dto));
  }

  @Get('mes-reclamations')
  miennes(@Utilisateur() u: UtilisateurCourant, @Query() f: FiltresReclamationsDto) {
    return this.reclamations.lister(u, f, true);
  }

  @Get()
  @ApiOperation({
    summary: 'File des reclamations a traiter (limitee aux categories du role).',
  })
  file(@Utilisateur() u: UtilisateurCourant, @Query() f: FiltresReclamationsDto) {
    return this.reclamations.lister(u, f, false);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Fil de discussion (marque comme lu).' })
  consulter(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return this.reclamations.consulter(u, uuid);
  }

  @Post(':uuid/messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async repondre(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: MessageDto) {
    return avecMessage('Message envoyé.', await this.reclamations.repondre(u, uuid, dto.contenu));
  }

  @Put(':uuid/statut')
  @ApiOperation({
    summary: 'Change le statut (permission repondre_reclamation sur la categorie).',
  })
  async statut(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: StatutReclamationDto) {
    return avecMessage('Statut mis à jour.', await this.reclamations.changerStatut(u, uuid, dto.statut));
  }
}
