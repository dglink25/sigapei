/**
 * Controller Super Administrateur — Module Paiements
 * Préfixe : /v1/admin/paiements
 * Protégé par JwtGuard + SuperAdminGuard (toutes les routes exigent role = super_admin).
 */
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Put, Query, Req, UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminService, CreerModePaiementDto, ModifierModePaiementDto, AccorderAccesDto } from './super-admin.service';
import { AdministrationService } from './administration.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { ContexteAcces } from '../database/contexte';
import {
  IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean,
  IsNumber, Min, IsUUID, IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditService } from '../audit/audit.service';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class ModifierAgregateurDto {
  @IsOptional() @IsIn(['actif', 'inactif', 'suspendu'])
  statut?: 'actif' | 'inactif' | 'suspendu';

  @IsOptional() @IsIn(['test', 'production'])
  environnement?: 'test' | 'production';
}

class CreerModePaiementBodyDto {
  @IsString() @IsNotEmpty()
  agregateurCode: string;

  @IsString() @IsNotEmpty()
  code: string;

  @IsString() @IsNotEmpty()
  libelle: string;

  @IsString() @IsNotEmpty()
  pays: string;

  @IsString() @IsNotEmpty()
  operateur: string;

  @IsIn(['mobile_money', 'carte', 'banque'])
  type: 'mobile_money' | 'carte' | 'banque';

  @IsIn(['entree', 'sortie'])
  sens: 'entree' | 'sortie';

  @IsString() @IsNotEmpty()
  devise: string;

  @IsPositive() @Type(() => Number)
  montantMin: number;

  @IsOptional() @IsPositive() @Type(() => Number)
  montantMax?: number;

  @IsOptional() @IsPositive() @Type(() => Number)
  multiple?: number;

  @IsNumber() @Min(0) @Type(() => Number)
  fraisTaux: number;

  @IsOptional() @Min(0) @Type(() => Number)
  fraisFixe?: number;

  @IsOptional() @Min(0) @Type(() => Number)
  delaiReglementHeures?: number;

  @IsOptional() @IsBoolean()
  redirection?: boolean;
}

class ModifierModePaiementBodyDto {
  @IsOptional() @IsString() @IsNotEmpty()
  libelle?: string;

  @IsOptional() @IsPositive() @Type(() => Number)
  montantMin?: number;

  @IsOptional() @Type(() => Number)
  montantMax?: number | null;

  @IsOptional() @IsPositive() @Type(() => Number)
  multiple?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  fraisTaux?: number;

  @IsOptional() @Min(0) @Type(() => Number)
  fraisFixe?: number;

  @IsOptional() @Min(0) @Type(() => Number)
  delaiReglementHeures?: number;

  @IsOptional() @IsBoolean()
  redirection?: boolean;

  @IsOptional() @IsIn(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';
}

class AccorderAccesBodyDto {
  @IsUUID()
  etablissementUuid: string;

  @IsPositive() @Type(() => Number)
  modePaiementId: number;

  @IsOptional() @Min(0) @Type(() => Number)
  plafondAvance?: number | null;
}

class ModifierStatutAccordDto {
  @IsIn(['accorde', 'suspendu', 'revoque', 'refuse'])
  statut: 'accorde' | 'suspendu' | 'revoque' | 'refuse';

  @IsOptional() @IsString()
  motif?: string;
}

class InterrupteurDto {
  @IsIn(['global', 'agregateur', 'mode', 'etablissement', 'portefeuille'])
  portee: string;

  @IsOptional() @IsUUID()
  cibleUuid?: string;

  @IsString() @IsNotEmpty()
  motif: string;
}

class ParametresPlatformeBodyDto {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  commissionAvanceTaux?: number;

  @IsOptional() @Min(0) @Type(() => Number)
  commissionAvanceMin?: number;

  @IsOptional() @Type(() => Number)
  seuilApprobationRemboursement?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────

@UseGuards(JwtGuard, SuperAdminGuard)
@Controller('admin/paiements')
export class SuperAdminController {
  constructor(
    private readonly service: SuperAdminService,
    private readonly adminService: AdministrationService,
    private readonly audit: AuditService,
  ) {}

  private ctx(req: Request): ContexteAcces {
    return { role: 'super_admin' };
  }

  private acteur(req: Request): string {
    return (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
  }

  // ── Statistiques globales ──

  @Get('stats')
  async stats(@Req() req: Request) {
    return this.service.statistiquesGlobales(this.ctx(req));
  }

  // ── Agrégateurs ──

  @Get('agregateurs')
  async listerAgregateurs(@Req() req: Request) {
    return this.service.listerAgregateurs(this.ctx(req));
  }

  @Patch('agregateurs/:uuid')
  async modifierAgregateur(
    @Param('uuid') uuid: string,
    @Body() body: ModifierAgregateurDto,
    @Req() req: Request,
  ) {
    return this.service.modifierAgregateur(uuid, body, this.acteur(req), this.ctx(req));
  }

  // ── Modes de paiement ──

  @Get('modes-paiement')
  async listerModes(
    @Query('agregateurCode') agregateurCode?: string,
    @Query('sens') sens?: string,
    @Query('type') type?: string,
    @Req() req?: Request,
  ) {
    return this.service.listerModesPaiement({ agregateurCode, sens, type }, this.ctx(req!));
  }

  @Post('modes-paiement')
  @HttpCode(HttpStatus.CREATED)
  async creerMode(@Body() body: CreerModePaiementBodyDto, @Req() req: Request) {
    const dto: CreerModePaiementDto = {
      ...body,
      montantMin: BigInt(body.montantMin),
      montantMax: body.montantMax != null ? BigInt(body.montantMax) : null,
      multiple: body.multiple != null ? BigInt(body.multiple) : undefined,
      fraisFixe: body.fraisFixe != null ? BigInt(body.fraisFixe) : undefined,
    };
    return this.service.creerModePaiement(dto, this.acteur(req), this.ctx(req));
  }

  @Patch('modes-paiement/:uuid')
  async modifierMode(
    @Param('uuid') uuid: string,
    @Body() body: ModifierModePaiementBodyDto,
    @Req() req: Request,
  ) {
    const dto: ModifierModePaiementDto = {
      ...body,
      montantMin: body.montantMin != null ? BigInt(body.montantMin) : undefined,
      montantMax: body.montantMax != null ? BigInt(body.montantMax) : body.montantMax,
      multiple: body.multiple != null ? BigInt(body.multiple) : undefined,
      fraisFixe: body.fraisFixe != null ? BigInt(body.fraisFixe) : undefined,
    };
    return this.service.modifierModePaiement(uuid, dto, this.acteur(req), this.ctx(req));
  }

  // ── Accords établissements ──

  @Get('accords')
  async listerAccords(
    @Query('etablissementUuid') etablissementUuid?: string,
    @Query('agregateurCode') agregateurCode?: string,
    @Query('statut') statut?: string,
    @Req() req?: Request,
  ) {
    return this.service.listerAccords({ etablissementUuid, agregateurCode, statut }, this.ctx(req!));
  }

  @Post('accords')
  @HttpCode(HttpStatus.CREATED)
  async accorderAcces(@Body() body: AccorderAccesBodyDto, @Req() req: Request) {
    const dto: AccorderAccesDto = {
      etablissementUuid: body.etablissementUuid,
      modePaiementId: body.modePaiementId,
      plafondAvance: body.plafondAvance != null ? BigInt(body.plafondAvance) : null,
    };
    return this.service.accorderAcces(dto, this.acteur(req), this.ctx(req));
  }

  @Patch('accords/:uuid/statut')
  async modifierStatutAccord(
    @Param('uuid') uuid: string,
    @Body() body: ModifierStatutAccordDto,
    @Req() req: Request,
  ) {
    return this.service.modifierStatutAccord(uuid, body.statut, body.motif, this.acteur(req), this.ctx(req));
  }

  // ── Paramètres plateforme ──

  @Get('parametres-plateforme')
  async obtenirParametres(@Req() req: Request) {
    return this.adminService.obtenirParametresPlateforme(this.ctx(req));
  }

  @Patch('parametres-plateforme/:devise')
  async mettreAJourParametres(
    @Param('devise') devise: string,
    @Body() body: ParametresPlatformeBodyDto,
    @Req() req: Request,
  ) {
    return this.adminService.mettreAJourParametresPlateforme(
      devise.toUpperCase(),
      {
        commissionAvanceTaux: body.commissionAvanceTaux,
        commissionAvanceMin: body.commissionAvanceMin != null ? BigInt(body.commissionAvanceMin) : undefined,
        seuilApprobationRemboursement: body.seuilApprobationRemboursement != null ? BigInt(body.seuilApprobationRemboursement) : body.seuilApprobationRemboursement,
      },
      this.acteur(req), this.ctx(req),
    );
  }

  // ── Interrupteurs de sécurité ──

  @Get('interrupteurs')
  async listerInterrupteurs(@Req() req: Request) {
    return this.service.interrupteursActifs(this.ctx(req));
  }

  @Post('interrupteurs')
  @HttpCode(HttpStatus.CREATED)
  async activerInterrupteur(@Body() body: InterrupteurDto, @Req() req: Request) {
    return this.adminService.activerInterrupteur(body.portee, body.cibleUuid ?? null, body.motif, this.acteur(req), this.ctx(req));
  }

  @Delete('interrupteurs/:uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async desactiverInterrupteur(@Param('uuid') uuid: string, @Req() req: Request) {
    await this.adminService.desactiverInterrupteur(uuid, this.acteur(req), this.ctx(req));
  }

  // ── Devises ──

  @Get('devises')
  async listerDevises(@Req() req: Request) {
    return this.service.listerDevises(this.ctx(req));
  }

  // ── Journal d'audit ──

  @Get('audit')
  async journalAudit(
    @Query('etablissementUuid') etablissementUuid?: string,
    @Query('action') action?: string,
    @Query('resultat') resultat?: string,
    @Query('du') du?: string,
    @Query('au') au?: string,
    @Query('page') page?: number,
    @Query('limite') limite?: number,
    @Req() req?: Request,
  ) {
    return this.service.journalAudit(
      { etablissementUuid, action, resultat, du, au, page, limite },
      this.ctx(req!),
    );
  }
}
