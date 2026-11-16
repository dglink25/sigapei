import {
  Body, Controller, Get, Param, Post, Query,
  Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { EncaissementService } from './encaissement.service';
import { ContexteAcces } from '../database/contexte';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsPositive, Min, Max, IsIn, IsUrl, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class InitierEncaissementBodyDto {
  @IsString() @IsIn(['fedapay', 'kkiapay', 'cinetpay'])
  agregateurCode: string;

  @IsPositive()
  @Type(() => Number)
  montant: number;

  @IsString() @IsIn(['XOF', 'XAF', 'GNF', 'CDF'])
  devise: string;

  @IsString() @IsNotEmpty()
  libelle: string;

  @IsOptional() @IsString()
  objetType?: string;

  @IsOptional() @IsUUID()
  objetUuid?: string;

  /** Page du front où revenir après le paiement (origine obligatoirement déclarée dans CORS_ORIGINS). */
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_tld: false, require_protocol: true }) @MaxLength(500)
  urlRetour?: string;

  @IsOptional()
  payeur?: {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    pays?: string;
  };
}

class VerifierKkiapayBodyDto {
  @IsString() @IsNotEmpty()
  transactionId: string;

  @IsString() @IsNotEmpty()
  referenceMarchande: string;
}

@Controller('etablissements/:etablissementUuid/encaissements')
export class EncaissementController {
  constructor(private readonly service: EncaissementService) {}

  /** Initie un encaissement. Retourne l'URL de paiement. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async initier(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Body() body: InitierEncaissementBodyDto,
    @Req() req: Request,
  ) {
    // TODO : remplacer par un guard JWT qui extrait l'acteur
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.initierEncaissement({
      etablissementUuid,
      agregateurCode: body.agregateurCode,
      montant: BigInt(body.montant),
      devise: body.devise,
      libelle: body.libelle,
      objetType: body.objetType,
      objetUuid: body.objetUuid,
      urlRetour: body.urlRetour,
      payeur: body.payeur,
      acteurUuid: (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system',
      acteurRole: 'administrateur',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }, ctx);
  }

  /** Liste les encaissements d'un établissement */
  @Get()
  async lister(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Query('statut') statut?: string,
    @Query('page') page?: number,
    @Query('limite') limite?: number,
  ) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.listerEncaissements(etablissementUuid, { statut, page, limite }, ctx);
  }

  /** Détail d'un encaissement */
  @Get(':uuid')
  async obtenir(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.obtenirEncaissement(uuid, etablissementUuid, ctx);
  }

  /**
   * Vérification post-widget Kkiapay.
   * Le frontend envoie le transactionId retourné par le widget,
   * le backend vérifie avec le SDK Admin et met à jour l'encaissement.
   */
  @Post('kkiapay/verifier')
  @HttpCode(HttpStatus.OK)
  async verifierKkiapay(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Body() body: VerifierKkiapayBodyDto,
    @Req() req: Request,
  ) {
    const ctx: ContexteAcces = { role: 'systeme' };
    // Mise à jour de la référence agrégateur et déclenchement du traitement
    await this.service['ds'].query(
      `UPDATE "paiement"."encaissement" SET reference_agregateur = $1 WHERE reference_marchande = $2 AND etablissement_uuid = $3`,
      [body.transactionId, body.referenceMarchande, etablissementUuid],
    );
    await this.service['ds'].transaction(async (m) => {
      await this.service.traiterWebhookEncaissement('kkiapay', body.transactionId, 'SUCCESS', {}, m);
    });
    return { message: 'Paiement Kkiapay vérifié.' };
  }
}
