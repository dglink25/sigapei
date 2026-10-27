import { Body, Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Utilisateur, UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { SansContexteUtilisateur } from '../common/decorators/public.decorator';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { avecMessage } from '../common/filtres/reponse.interceptor';
import { DocumentsService } from '../generation/documents.service';
import { DemandesService } from './demandes.service';
import { FiltresDemandesDto, MotifDto, PrioriteDto, SoumettreDemandeDto, TraiterDemandeDto } from './dto/demandes.dto';

const Uuid = new ParseUUIDPipe({
  exceptionFactory: () => ErreurMetier.introuvable(),
});

@ApiTags('Demandes administratives')
@ApiBearerAuth()
@Controller('demandes')
export class DemandesController {
  constructor(private readonly demandes: DemandesService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Soumet une demande de document (tout profil) : eligibilite verifiee immediatement.',
  })
  async soumettre(@Utilisateur() u: UtilisateurCourant, @Body() dto: SoumettreDemandeDto) {
    const d = await this.demandes.soumettre(u, dto);
    const message =
      {
        bloquee: `Demande enregistrée mais bloquée : ${d.motif_blocage}`,
        prete: 'Votre document est prêt.',
      }[d.statut as string] ?? 'Demande enregistrée.';
    return avecMessage(message, d);
  }

  @Get('mes-demandes')
  @ApiOperation({
    summary: "Demandes de l'utilisateur connecte (suivi facon colis).",
  })
  mesDemandes(@Utilisateur() u: UtilisateurCourant, @Query() f: FiltresDemandesDto) {
    return this.demandes.mesDemandes(u, f);
  }

  @Get()
  @ApiOperation({
    summary: "File des demandes de l'etablissement (permission consulter_demandes), prioritaires puis plus anciennes.",
  })
  file(@Utilisateur() u: UtilisateurCourant, @Query() f: FiltresDemandesDto) {
    return this.demandes.file(u, f);
  }

  @Get(':uuid')
  @ApiOperation({
    summary: "Detail et chronologie d'une demande (demandeur ou gestionnaire).",
  })
  consulter(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return this.demandes.consulter(u, uuid);
  }

  @Get(':uuid/document')
  @ApiOperation({
    summary: 'Lien de telechargement signe du document (valable 5 minutes).',
  })
  lien(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return this.demandes.lienDocument(u, uuid);
  }

  @Post(':uuid/resoumettre')
  @HttpCode(200)
  @ApiOperation({
    summary: "Relance la verification d'une demande bloquee (demandeur).",
  })
  async resoumettre(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return avecMessage('Vérification relancée.', await this.demandes.resoumettre(u, uuid));
  }

  @Post(':uuid/annuler')
  @HttpCode(200)
  @ApiOperation({ summary: 'Annule une demande non terminee (demandeur).' })
  async annuler(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string) {
    return avecMessage('Demande annulée.', await this.demandes.annuler(u, uuid));
  }

  @Put(':uuid/traiter')
  @ApiOperation({
    summary: 'Genere le document (permission traiter_demande) apres nouvelle verification.',
  })
  async traiter(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: TraiterDemandeDto) {
    return avecMessage('Document généré : le demandeur est notifié.', await this.demandes.traiter(u, uuid, dto));
  }

  @Put(':uuid/rejeter')
  @ApiOperation({
    summary: 'Rejette une demande, motif obligatoire (permission traiter_demande).',
  })
  async rejeter(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: MotifDto) {
    return avecMessage('Demande rejetée.', await this.demandes.rejeter(u, uuid, dto.motif));
  }

  @Put(':uuid/derogation')
  @ApiOperation({
    summary: 'Accorde une derogation a une demande bloquee (permission accorder_derogation, journalisee).',
  })
  async deroger(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: MotifDto) {
    return avecMessage('Dérogation accordée.', await this.demandes.deroger(u, uuid, dto.motif));
  }

  @Put(':uuid/priorite')
  @ApiOperation({
    summary: 'Marque ou retire la priorite (permission traiter_demande).',
  })
  prioriser(@Utilisateur() u: UtilisateurCourant, @Param('uuid', Uuid) uuid: string, @Body() dto: PrioriteDto) {
    return this.demandes.prioriser(u, uuid, dto.priorite);
  }
}

/** Telechargement par lien signe : aucun en-tete d'authentification, la signature est l'autorisation. */
@ApiTags('Demandes administratives')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly demandes: DemandesService,
    private readonly documents: DocumentsService,
  ) {}

  @Get(':uuid')
  @SansContexteUtilisateur()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({
    summary: 'PDF du document (lien signe obtenu par GET /demandes/{uuid}/document). Lien modifie ou expire : 403.',
  })
  async telecharger(
    @Param('uuid', Uuid) uuid: string,
    @Query('t') t: string,
    @Query('e') e: string,
    @Query('s') s: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenant = this.documents.verifierLien(uuid, String(t ?? ''), String(e ?? ''), String(s ?? ''));
    if (tenant === null) throw ErreurMetier.accesRefuse('Lien invalide ou expiré : redemandez le document.', 'LIEN_INVALIDE');
    const { pdf, nom } = await this.demandes.document(uuid, tenant);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nom}"`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(pdf);
  }
}
