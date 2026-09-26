import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppareilsService } from './appareils.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Appareils & sessions')
@ApiBearerAuth()
@Controller('moi/appareils')
export class AppareilsController {
  constructor(private readonly appareilsService: AppareilsService) {}

  @Get()
  @ApiOperation({ summary: "Liste les appareils et sessions actives de l'utilisateur." })
  lister(@CurrentUser('sub') utilisateurUuid: string, @CurrentUser('utilisateurId') utilisateurId: string) {
    return this.appareilsService.listerPourUtilisateur(utilisateurId);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Revoque un appareil precis (session + empreinte associees).' })
  revoquer(
    @Param('uuid') uuid: string,
    @CurrentUser('sub') utilisateurUuid: string,
    @CurrentUser('utilisateurId') utilisateurId: string,
  ) {
    return this.appareilsService.revoquer(uuid, utilisateurUuid, utilisateurId).then(() => ({ code: 'APPAREIL_REVOQUE' }));
  }
}
