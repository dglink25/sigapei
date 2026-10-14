import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServicesEtablissementsService } from './services-etablissements.service';
import { AssignerServicesDto } from './dto/assigner-services.dto';
import { BloquerAssignationDto, ModifierAssignationDto } from './dto/modifier-assignation.dto';

/** Assignation des services aux etablissements : reservee au super administrateur. */
@ApiTags('Services des établissements')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('services-etablissements')
export class ServicesEtablissementsController {
  constructor(private readonly service: ServicesEtablissementsService) {}

  @Post()
  @ApiOperation({ summary: 'Assigne un ou plusieurs services (1 a 50) a un etablissement.' })
  assigner(@Body() dto: AssignerServicesDto, @CurrentUser('utilisateurId') utilisateurId: string) {
    return this.service.assigner(dto, { utilisateurId });
  }

  @Get('etablissements/:etablissementUuid')
  @ApiOperation({ summary: "Services assignes a un etablissement (avec statut et motif de blocage)." })
  listerParEtablissement(@Param('etablissementUuid', ParseUUIDPipe) etablissementUuid: string) {
    return this.service.listerParEtablissement(etablissementUuid);
  }

  @Get('services/:serviceUuid')
  @ApiOperation({ summary: 'Etablissements auxquels un service est assigne (pagine).' })
  listerParService(@Param('serviceUuid', ParseUUIDPipe) serviceUuid: string, @Query() dto: PaginationDto) {
    return this.service.listerParService(serviceUuid, dto);
  }

  @Get(':uuid')
  @ApiOperation({ summary: "Detail d'une assignation." })
  obtenir(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.service.obtenir(uuid);
  }

  @Put(':uuid')
  @ApiOperation({ summary: "Modifie le statut et/ou le motif d'une assignation." })
  modifier(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: ModifierAssignationDto, @CurrentUser('utilisateurId') utilisateurId: string) {
    return this.service.modifier(uuid, dto, { utilisateurId });
  }

  @Post(':uuid/bloquer')
  @ApiOperation({ summary: "Bloque le service pour cet etablissement (coupe l'acces de tous ses utilisateurs)." })
  bloquer(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: BloquerAssignationDto, @CurrentUser('utilisateurId') utilisateurId: string) {
    return this.service.bloquer(uuid, dto.motif, { utilisateurId });
  }

  @Post(':uuid/reactiver')
  @ApiOperation({ summary: 'Reactive le service pour cet etablissement.' })
  reactiver(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser('utilisateurId') utilisateurId: string) {
    return this.service.reactiver(uuid, { utilisateurId });
  }

  @Delete(':uuid')
  @ApiOperation({ summary: "Retire le service de l'etablissement ; les droits des utilisateurs sont supprimes en cascade." })
  retirer(@Param('uuid', ParseUUIDPipe) uuid: string, @CurrentUser('utilisateurId') utilisateurId: string) {
    return this.service.retirer(uuid, { utilisateurId });
  }
}
