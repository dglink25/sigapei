import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccesServicesService } from './acces-services.service';

/** Acces de l'utilisateur connecte (tout role authentifie). */
@ApiTags('Accès aux services')
@ApiBearerAuth()
@Controller('moi/services')
export class MoiServicesController {
  constructor(private readonly acces: AccesServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Services auxquels je peux acceder (administrateur : tous les services actifs de mon etablissement).' })
  mesServices(@CurrentUser('sub') utilisateurUuid: string) {
    return this.acces.servicesDeUtilisateur(utilisateurUuid);
  }

  @Get(':serviceUuid/acces')
  @ApiOperation({ summary: 'Mes droits sur un service precis.' })
  monAcces(@CurrentUser('sub') utilisateurUuid: string, @Param('serviceUuid', ParseUUIDPipe) serviceUuid: string) {
    return this.acces.accesSurService(utilisateurUuid, serviceUuid);
  }
}
