import {
  Body, Controller, Delete, Get, Param, Post, Put, Patch,
  Query, Req, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { AdministrationService } from './administration.service';
import { ContexteAcces } from '../database/contexte';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

class ParametresEtabDto {
  @IsOptional() @IsIn(['manuel', 'immediat', 'quotidien', 'hebdomadaire'])
  reglementMode?: string;

  @IsOptional()
  reglementJourSemaine?: number;

  @IsOptional()
  reglementHeure?: number;

  @IsOptional()
  reglementMontantMin?: number;

  @IsOptional() @IsIn(['etablissement', 'payeur'])
  fraisEntreeACharge?: string;

  @IsOptional() @IsIn(['etablissement', 'beneficiaire'])
  fraisSortieACharge?: string;

  @IsOptional() @IsIn(['fonds_disponibles', 'avance_autorisee'])
  sourceFondsSortie?: string;

  @IsOptional() @IsBoolean()
  encaissementActif?: boolean;

  @IsOptional() @IsBoolean()
  decaissementActif?: boolean;
}

class DelegationDto {
  @IsUUID()
  utilisateurUuid: string;

  @IsBoolean()
  peutPreparer: boolean;

  @IsBoolean()
  peutApprouver: boolean;
}

@Controller()
export class AdministrationController {
  constructor(private readonly service: AdministrationService) {}

  // ─── Paramètres établissement ───

  @Get('etablissements/:etablissementUuid/parametres/:devise')
  async obtenirParametres(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('devise') devise: string,
  ) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.obtenirParametres(etablissementUuid, devise.toUpperCase(), ctx);
  }

  @Put('etablissements/:etablissementUuid/parametres/:devise')
  async upsertParametres(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('devise') devise: string,
    @Body() body: ParametresEtabDto,
    @Req() req: Request,
  ) {
    const acteurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    await this.service.upsertParametres(
      etablissementUuid, devise.toUpperCase(),
      {
        reglementMode: body.reglementMode,
        reglementJourSemaine: body.reglementJourSemaine,
        reglementHeure: body.reglementHeure,
        reglementMontantMin: body.reglementMontantMin !== undefined ? BigInt(body.reglementMontantMin) : undefined,
        fraisEntreeACharge: body.fraisEntreeACharge,
        fraisSortieACharge: body.fraisSortieACharge,
        sourceFondsSortie: body.sourceFondsSortie,
        encaissementActif: body.encaissementActif,
        decaissementActif: body.decaissementActif,
      },
      acteurUuid, ctx,
    );
    return { message: 'Paramètres mis à jour.' };
  }

  // ─── Délégations ───

  @Get('etablissements/:etablissementUuid/delegations')
  async listerDelegations(@Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.listerDelegations(etablissementUuid, ctx);
  }

  @Post('etablissements/:etablissementUuid/delegations')
  @HttpCode(HttpStatus.CREATED)
  async creerDelegation(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Body() body: DelegationDto,
    @Req() req: Request,
  ) {
    const acteurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.creerDelegation(
      etablissementUuid, body.utilisateurUuid,
      body.peutPreparer, body.peutApprouver,
      acteurUuid, ctx,
    );
  }

  @Delete('etablissements/:etablissementUuid/delegations/:uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoquerDelegation(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Req() req: Request,
  ) {
    const acteurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    await this.service.revoquerDelegation(uuid, etablissementUuid, acteurUuid, ctx);
  }

  // ─── Portefeuilles ───

  @Get('etablissements/:etablissementUuid/portefeuilles')
  async listerPortefeuilles(@Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.listerPortefeuilles(etablissementUuid, ctx);
  }

  @Get('etablissements/:etablissementUuid/portefeuilles/:devise/historique')
  async historiqueSoldes(
    @Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string,
    @Param('devise') devise: string,
    @Query('du') du: string,
    @Query('au') au: string,
  ) {
    const ctx: ContexteAcces = { role: 'administrateur', etablissementUuid };
    return this.service.historiqueSoldes(
      etablissementUuid, devise.toUpperCase(),
      new Date(du ?? '2020-01-01'), new Date(au ?? new Date().toISOString()),
      ctx,
    );
  }

  // ─── Paramètres plateforme (super admin) ───

  @Get('admin/parametres-plateforme')
  async obtenirParametresPlateforme(@Req() req: Request) {
    const ctx: ContexteAcces = { role: 'super_admin' };
    return this.service.obtenirParametresPlateforme(ctx);
  }

  @Patch('admin/parametres-plateforme/:devise')
  async mettreAJourParametresPlateforme(
    @Param('devise') devise: string,
    @Body() body: { commissionAvanceTaux?: number; commissionAvanceMin?: number; seuilApprobationRemboursement?: number | null },
    @Req() req: Request,
  ) {
    const acteurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'super_admin' };
    await this.service.mettreAJourParametresPlateforme(
      devise.toUpperCase(),
      {
        commissionAvanceTaux: body.commissionAvanceTaux,
        commissionAvanceMin: body.commissionAvanceMin !== undefined ? BigInt(body.commissionAvanceMin) : undefined,
        seuilApprobationRemboursement: body.seuilApprobationRemboursement !== undefined && body.seuilApprobationRemboursement !== null
          ? BigInt(body.seuilApprobationRemboursement) : body.seuilApprobationRemboursement,
      },
      acteurUuid, ctx,
    );
    return { message: 'Paramètres plateforme mis à jour.' };
  }

  // ─── Interrupteurs de sécurité (super admin) ───

  @Post('admin/interrupteurs')
  @HttpCode(HttpStatus.CREATED)
  async activerInterrupteur(
    @Body() body: { portee: string; cibleUuid?: string; motif: string },
    @Req() req: Request,
  ) {
    const acteurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'super_admin' };
    return this.service.activerInterrupteur(body.portee, body.cibleUuid ?? null, body.motif, acteurUuid, ctx);
  }

  @Delete('admin/interrupteurs/:uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async desactiverInterrupteur(@Param('uuid', ParseUUIDPipe) uuid: string, @Req() req: Request) {
    const acteurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    const ctx: ContexteAcces = { role: 'super_admin' };
    await this.service.desactiverInterrupteur(uuid, acteurUuid, ctx);
  }
}
