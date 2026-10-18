import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AccesServicesService } from './acces-services.service';
import { AccesCacheService } from './acces-cache.service';

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGEX_CODE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

/** Canal RabbitMQ : verification d'acces (RPC) et invalidation du cache sur suspension/reactivation d'un etablissement. */
@Controller()
export class AccesRpcController {
  constructor(
    private readonly acces: AccesServicesService,
    private readonly cache: AccesCacheService,
  ) {}

  @MessagePattern('identite.acces')
  async verifier(@Payload() data: { utilisateurUuid?: string; serviceCode?: string }) {
    if (typeof data?.utilisateurUuid !== 'string' || !REGEX_UUID.test(data.utilisateurUuid)) {
      return { autorise: false, motif: 'REQUETE_INVALIDE' };
    }
    if (data.serviceCode === undefined) return this.acces.servicesDeUtilisateur(data.utilisateurUuid);
    if (typeof data.serviceCode !== 'string' || !REGEX_CODE.test(data.serviceCode)) {
      return { autorise: false, motif: 'REQUETE_INVALIDE' };
    }
    return this.acces.verifierAcces(data.utilisateurUuid, data.serviceCode);
  }

  @EventPattern('etablissement.suspendu')
  async surSuspension(@Payload() data: { data?: { tenantUuid?: string }; tenantUuid?: string }) {
    await this.invalider(data);
  }

  @EventPattern('etablissement.reactive')
  async surReactivation(@Payload() data: { data?: { tenantUuid?: string }; tenantUuid?: string }) {
    await this.invalider(data);
  }

  private async invalider(data: { data?: { tenantUuid?: string }; tenantUuid?: string }) {
    const tenantUuid = data?.data?.tenantUuid ?? data?.tenantUuid;
    if (typeof tenantUuid === 'string' && REGEX_UUID.test(tenantUuid)) await this.cache.invaliderTenant(tenantUuid);
  }
}
