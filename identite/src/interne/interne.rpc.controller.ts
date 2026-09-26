import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistRedis } from '../jetons/token-blacklist.redis';
import { SessionRedisService } from '../jetons/session.redis.service';
import { PayloadJwt } from '../jetons/jetons.types';
import { RolesService } from '../roles/roles.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { normaliserTelephoneE164 } from '../common/utils/phone.util';

/**
 * Canal RPC/evenements RabbitMQ (queue "identite.rpc") : permet aux 11
 * autres microservices d'interroger l'identite en requete/reponse (pattern
 * "identite.introspection"), et de lui notifier des evenements metier en
 * fire-and-forget (pattern "etablissement.valide", etc.), en complement de
 * /interne/introspection (HTTP, via la Gateway).
 */
@Controller()
export class InterneRpcController {
  private readonly logger = new Logger(InterneRpcController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistRedis,
    private readonly sessions: SessionRedisService,
    private readonly rolesService: RolesService,
    private readonly utilisateursService: UtilisateursService,
  ) {}

  @MessagePattern('identite.introspection')
  async introspection(@Payload() data: { token: string }) {
    try {
      const payload = await this.jwtService.verifyAsync<PayloadJwt>(data.token, {
        secret: this.config.get<string>('jwt.accessSecret'),
        issuer: this.config.get<string>('jwt.issuer'),
      });
      if (await this.blacklist.estRevoque(payload.jti)) return { valide: false, motif: 'JETON_REVOQUE' };
      const session = await this.sessions.recuperer(payload.jti);
      if (!session) return { valide: false, motif: 'SESSION_INTROUVABLE' };
      return { valide: true, sub: payload.sub, tenantId: payload.tenantId, roleCode: payload.roleCode };
    } catch {
      return { valide: false, motif: 'JETON_INVALIDE_OU_EXPIRE' };
    }
  }

  /**
   * Consomme l'evenement "etablissement.valide" publie par api-etablissements
   * a la validation definitive d'une demande (section 7.4, point 4 du cahier
   * des charges du microservice Etablissements) : cree le compte
   * administrateur (role = administrateur, tenantId = uuid de l'etablissement).
   *
   * Idempotent : si un utilisateur existe deja avec cet e-mail ou ce
   * telephone, aucun doublon n'est cree (peut arriver en cas de re-livraison
   * du message par RabbitMQ).
   */
  @EventPattern('etablissement.valide')
  async surEtablissementValide(
    @Payload()
    data: {
      data: {
        tenantUuid: string;
        nomEtablissement: string;
        dirigeantNom: string;
        dirigeantEmail?: string;
        dirigeantTelephone?: string;
      };
    },
  ) {
    const evenement = data?.data ?? (data as any);
    const { tenantUuid, dirigeantNom, dirigeantEmail, dirigeantTelephone } = evenement;

    try {
      if (dirigeantEmail) {
        const existant = await this.utilisateursService.trouverParEmail(dirigeantEmail.toLowerCase());
        if (existant) {
          this.logger.log(`Compte deja existant pour ${dirigeantEmail}, evenement ignore (idempotence).`);
          return;
        }
      }

      const roles = await this.rolesService.lister();
      const roleAdmin = roles.find((r) => r.code === 'administrateur');
      if (!roleAdmin) {
        this.logger.error("Role 'administrateur' introuvable : impossible de creer le compte.");
        return;
      }

      let telephoneE164: string | null = null;
      if (dirigeantTelephone) {
        try {
          telephoneE164 = normaliserTelephoneE164(dirigeantTelephone).e164;
        } catch {
          this.logger.warn(`Telephone dirigeant invalide (${dirigeantTelephone}), compte cree sans telephone.`);
        }
      }

      await this.utilisateursService.creerUtilisateurAdministrateur({
        tenantId: tenantUuid,
        roleId: roleAdmin.id,
        nomComplet: dirigeantNom,
        email: dirigeantEmail?.toLowerCase() ?? null,
        telephone: telephoneE164,
      });

      this.logger.log(`Compte administrateur cree pour le tenant ${tenantUuid} (${dirigeantEmail ?? telephoneE164}).`);
    } catch (err) {
      this.logger.error(`Echec creation compte administrateur pour tenant ${tenantUuid}: ${(err as Error).message}`);
    }
  }
}
