import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { SansContexteUtilisateur } from './common/decorators/public.decorator';

/** Sonde de sante pour Docker/healthcheck. */
@ApiExcludeController()
@SansContexteUtilisateur()
@SkipThrottle()
@Controller()
export class SanteController {
  @Get('sante')
  sante() {
    return {
      statut: 'ok',
      service: 'api-demandes',
      horodatage: new Date().toISOString(),
    };
  }
}
