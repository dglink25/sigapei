import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AccesServicesService } from './acces-services.service';
import { InternalSecretSafeGuard } from './internal-secret-safe.guard';
import { VerifierAccesQueryDto } from './dto/verifier-acces.dto';

/**
 * Verification d'acces pour la passerelle / les microservices : GET /interne/acces?utilisateurUuid=...&serviceCode=...
 * Protegee par X-Internal-Secret (pas de JWT) ; hors limitation de debit (trafic machine-a-machine).
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@UseGuards(InternalSecretSafeGuard)
@Controller('interne')
export class InterneAccesController {
  constructor(private readonly acces: AccesServicesService) {}

  @Get('acces')
  async verifier(@Query() q: VerifierAccesQueryDto) {
    if (q.serviceCode) {
      return { utilisateurUuid: q.utilisateurUuid, serviceCode: q.serviceCode, ...(await this.acces.verifierAcces(q.utilisateurUuid, q.serviceCode)) };
    }
    return this.acces.servicesDeUtilisateur(q.utilisateurUuid);
  }
}
