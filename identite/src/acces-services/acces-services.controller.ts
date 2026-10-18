import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccesServicesService } from './acces-services.service';
import { DefinirAccesDto, DefinirAccesLotDto } from './dto/definir-acces.dto';
import { ListerUtilisateursServiceDto } from './dto/lister-utilisateurs-service.dto';

/** Gestion des droits des utilisateurs sur les services : administrateur de l'etablissement uniquement. */
@ApiTags('Accès aux services')
@ApiBearerAuth()
@Roles('administrateur')
@Controller('acces-services')
export class AccesServicesController {
  constructor(private readonly acces: AccesServicesService) {}

  @Get('services')
  @ApiOperation({ summary: 'Services assignes a mon etablissement (actifs ou bloques).' })
  services(@CurrentUser('sub') acteur: string) {
    return this.acces.listerServicesEtablissement(acteur);
  }

  @Get('services/:serviceUuid/utilisateurs')
  @ApiOperation({ summary: 'Utilisateurs de mon etablissement et leur droit sur un service (pagine ; filtres q, autorise).' })
  utilisateursDuService(
    @CurrentUser('sub') acteur: string,
    @Param('serviceUuid', ParseUUIDPipe) serviceUuid: string,
    @Query() dto: ListerUtilisateursServiceDto,
  ) {
    return this.acces.listerUtilisateursDuService(acteur, serviceUuid, dto);
  }

  @Put('services/:serviceUuid/utilisateurs')
  @ApiOperation({ summary: 'Accorde/revoque des acces en lot (1 a 200 utilisateurs, transaction unique).' })
  definirEnLot(
    @CurrentUser('sub') acteur: string,
    @Param('serviceUuid', ParseUUIDPipe) serviceUuid: string,
    @Body() dto: DefinirAccesLotDto,
  ) {
    return this.acces.definirAccesLot(acteur, serviceUuid, dto.accords);
  }

  @Get('utilisateurs/:utilisateurUuid')
  @ApiOperation({ summary: "Droits d'un utilisateur de mon etablissement sur chaque service." })
  droitsUtilisateur(@CurrentUser('sub') acteur: string, @Param('utilisateurUuid', ParseUUIDPipe) utilisateurUuid: string) {
    return this.acces.droitsUtilisateur(acteur, utilisateurUuid);
  }

  @Put('utilisateurs/:utilisateurUuid/services/:serviceUuid')
  @ApiOperation({ summary: "Accorde ou revoque l'acces d'un utilisateur a un service." })
  definir(
    @CurrentUser('sub') acteur: string,
    @Param('utilisateurUuid', ParseUUIDPipe) utilisateurUuid: string,
    @Param('serviceUuid', ParseUUIDPipe) serviceUuid: string,
    @Body() dto: DefinirAccesDto,
  ) {
    return this.acces.definirAcces(acteur, utilisateurUuid, serviceUuid, dto.autorise);
  }
}
