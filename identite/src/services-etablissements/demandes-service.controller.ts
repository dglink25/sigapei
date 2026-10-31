import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { DemandesServiceService } from './demandes-service.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class SoumettreDemandeServiceDto {
  @IsUUID('4') serviceUuid: string;
  @IsOptional() @IsString() motif?: string;
}

class AccepterDemandeServiceDto {
  @IsOptional() @IsString() note?: string;
}

class RefuserDemandeServiceDto {
  @IsString() @MinLength(10) note: string;
}

@ApiTags('Demandes de services')
@ApiBearerAuth()
@Controller('services')
export class DemandesServiceController {
  constructor(private readonly service: DemandesServiceService) {}

  // ── Côté admin établissement ─────────────────────────────────────────

  @Get('mes-demandes')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Liste mes demandes de service pour mon établissement.' })
  mesDemandes(@CurrentUser('tenantId') tenantId: string) {
    return this.service.mesDemandes(tenantId);
  }

  @Get('disponibles-demande')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Services actifs du catalogue non encore assignés et disponibles pour une demande.' })
  servicesDisponibles(@CurrentUser('tenantId') tenantId: string) {
    return this.service.servicesDisponibles(tenantId);
  }

  @Post('demandes')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Soumet une demande d\'accès à un service au Super Administrateur.' })
  soumettre(@CurrentUser('tenantId') tenantId: string, @Body() dto: SoumettreDemandeServiceDto) {
    return this.service.soumettre(tenantId, dto.serviceUuid, dto.motif ?? '');
  }

  @Delete('demandes/:uuid')
  @Roles('administrateur')
  @ApiOperation({ summary: 'Annule une demande de service en attente.' })
  annuler(@CurrentUser('tenantId') tenantId: string, @Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.service.annuler(tenantId, uuid);
  }

  // ── Côté super admin ──────────────────────────────────────────────────

  @Get('demandes/stats')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Statistiques et compteurs des demandes de services (pour le dashboard).' })
  compteurs() {
    return this.service.compteurs();
  }

  @Get('demandes')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Liste toutes les demandes de service (filtrables par statut).' })
  toutesLesDemandes(@Query('statut') statut?: string) {
    return this.service.toutesLesDemandes(statut ?? 'en_attente');
  }

  @Post('demandes/:uuid/accepter')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Accepte une demande : assigne automatiquement le service à l\'établissement.' })
  accepter(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: AccepterDemandeServiceDto,
    @CurrentUser('utilisateurId') utilisateurId: string,
  ) {
    return this.service.accepter(uuid, dto, utilisateurId);
  }

  @Post('demandes/:uuid/refuser')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Refuse une demande avec une note/motif obligatoire.' })
  refuser(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() dto: RefuserDemandeServiceDto,
    @CurrentUser('utilisateurId') utilisateurId: string,
  ) {
    return this.service.refuser(uuid, dto.note, utilisateurId);
  }
}
