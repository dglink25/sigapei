import {
  Body, Controller, Get, Param, Post, Patch, Query,
  Req, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { DecaissementService } from './decaissement.service';
import { ContexteAcces } from '../database/contexte';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

class PreparerDecaissementDto {
  @IsString() @IsIn(['fedapay', 'kkiapay', 'cinetpay'])
  agregateurCode: string;

  @IsPositive() @Type(() => Number)
  montant: number;

  @IsString() @IsIn(['XOF', 'XAF', 'GNF', 'CDF'])
  devise: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsString() @IsIn(['personnel', 'reversement', 'retrait'])
  type: 'personnel' | 'reversement' | 'retrait';

  beneficiaire: { nom: string; telephone: string; pays?: string };
}

class DecisionDto {
  @IsOptional() @IsString()
  motif?: string;
}

@Controller('etablissements/:etablissementUuid/decaissements')
export class DecaissementController {
  constructor(private readonly service: DecaissementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async preparer(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Body() body: PreparerDecaissementDto,
    @Req() req: Request,
  ) {
    const utilisateurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'utilisateur', etablissementUuid };
    return this.service.preparerDecaissement({
      etablissementUuid,
      agregateurCode: body.agregateurCode,
      montant: BigInt(body.montant),
      devise: body.devise,
      description: body.description,
      type: body.type,
      beneficiaire: body.beneficiaire,
      preparePar: utilisateurUuid,
      acteurRole: 'utilisateur',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }, ctx);
  }

  @Post(':uuid/soumettre')
  @HttpCode(HttpStatus.NO_CONTENT)
  async soumettre(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Req() req: Request,
  ) {
    const utilisateurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'utilisateur', etablissementUuid };
    await this.service.soumettreApprobation(uuid, etablissementUuid, utilisateurUuid, 'utilisateur', ctx);
  }

  @Post(':uuid/approuver')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approuver(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() body: DecisionDto,
    @Req() req: Request,
  ) {
    const utilisateurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'utilisateur', etablissementUuid };
    await this.service.approuverDecaissement(uuid, etablissementUuid, utilisateurUuid, 'utilisateur', body.motif, ctx);
  }

  @Post(':uuid/rejeter')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejeter(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() body: DecisionDto,
    @Req() req: Request,
  ) {
    const utilisateurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'utilisateur', etablissementUuid };
    await this.service.rejeterDecaissement(uuid, etablissementUuid, utilisateurUuid, 'utilisateur', body.motif ?? '', ctx);
  }

  @Get()
  async lister(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Query('statut') statut?: string,
    @Query('page') page?: number,
    @Query('limite') limite?: number,
  ) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.listerDecaissements(etablissementUuid, { statut, page, limite }, ctx);
  }
}
