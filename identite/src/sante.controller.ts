import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

/** Sonde de sante pour Docker/Kubernetes (healthcheck). */
@ApiExcludeController()
@Controller()
export class SanteController {
  @Public()
  @Get('sante')
  sante() {
    return { statut: 'ok', service: 'api-identite', horodatage: new Date().toISOString() };
  }
}
