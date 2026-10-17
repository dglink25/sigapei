import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccesServicesService } from './acces-services.service';

/** Portail de l'utilisateur connecte (tout role authentifie). */
@ApiTags('Accès aux services')
@ApiBearerAuth()
@Controller('moi/portail')
export class MoiPortailController {
  constructor(private readonly acces: AccesServicesService) {}

  @Get()
  @ApiOperation({
    summary: "Portail : tous les services de mon etablissement avec l'etat de mon acces (accessible, motif), plus l'etablissement (slug).",
  })
  portail(@CurrentUser('sub') utilisateurUuid: string) {
    return this.acces.portail(utilisateurUuid);
  }
}
