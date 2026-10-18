import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ServicesService } from './services.service';
import { CreerServiceDto } from './dto/creer-service.dto';
import { ModifierServiceDto } from './dto/modifier-service.dto';
import { ListerServicesDto } from './dto/lister-services.dto';

@ApiTags('Services')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginee du catalogue des services (filtres : q, status).' })
  lister(@Query() dto: ListerServicesDto) {
    return this.services.lister(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Cree un service (le code est stable et unique).' })
  creer(@Body() dto: CreerServiceDto) {
    return this.services.creer(dto);
  }

  @Get(':uuid')
  @ApiOperation({ summary: "Detail d'un service." })
  obtenir(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.services.obtenir(uuid);
  }

  @Put(':uuid')
  @ApiOperation({ summary: 'Modifie nom, description ou statut (inactive = bloque partout). Le code est immuable.' })
  modifier(@Param('uuid', ParseUUIDPipe) uuid: string, @Body() dto: ModifierServiceDto) {
    return this.services.modifier(uuid, dto);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: "Supprime un service non assigne (sinon 409 : retirer les assignations ou le desactiver)." })
  supprimer(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.services.supprimer(uuid);
  }
}
