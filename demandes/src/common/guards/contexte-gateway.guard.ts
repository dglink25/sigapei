import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ROUTE_SANS_CONTEXTE } from '../decorators/public.decorator';
import { egalTempsConstant, secretValide } from '../secret.util';

export const ROLES_PLATEFORME = [
  'super_admin',
  'administrateur',
  'personnel',
  'enseignant',
  'apprenant',
  'parent',
] as const;

export interface UtilisateurCourant {
  uuid: string;
  tenantId: number;
  roleCode: (typeof ROLES_PLATEFORME)[number];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Garde globale (Regles n°3 et n°5) : contexte transmis par la Gateway.
 * Les en-tetes X-Tenant-Id / X-User-Id / X-User-Role ne sont acceptes QUE s'ils
 * sont accompagnes du secret interne : sans lui, n'importe quel conteneur du reseau
 * pourrait se declarer administrateur. Aucune verification JWT ici.
 * Toute anomalie => refus (fail closed). Les routes @SansContexteUtilisateur() sont ignorees.
 */
@Injectable()
export class ContexteGatewayGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const sansContexte = this.reflector.getAllAndOverride<boolean>(ROUTE_SANS_CONTEXTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (sansContexte) return true;

    const request = context.switchToHttp().getRequest();
    const attendu = this.config.get<string>('internalApiSecret');

    if (!secretValide(attendu)) {
      throw new ServiceUnavailableException({
        code: 'CONFIG_SECURITE_INVALIDE',
        message: 'Service momentanement indisponible.',
      });
    }

    const secret = request.headers['x-internal-secret'];
    if (typeof secret !== 'string' || !egalTempsConstant(attendu, secret)) {
      throw new UnauthorizedException({ code: 'APPEL_NON_AUTORISE', message: 'Acces refuse.' });
    }

    const tenant = String(request.headers['x-tenant-id'] ?? '');
    const uuid = String(request.headers['x-user-id'] ?? '').toLowerCase();
    const role = String(request.headers['x-user-role'] ?? '');

    if (!/^[1-9][0-9]{0,17}$/.test(tenant)) {
      throw new UnauthorizedException({
        code: 'TENANT_MANQUANT',
        message: 'Contexte etablissement manquant ou invalide.',
      });
    }
    if (!UUID.test(uuid)) {
      throw new UnauthorizedException({
        code: 'NON_AUTHENTIFIE',
        message: 'Vous devez etre connecte pour acceder a cette ressource.',
      });
    }
    if (!(ROLES_PLATEFORME as readonly string[]).includes(role)) {
      throw new ForbiddenException({ code: 'ROLE_INVALIDE', message: "Votre compte ne dispose pas d'un role valide." });
    }

    const utilisateur: UtilisateurCourant = {
      uuid,
      tenantId: Number(tenant),
      roleCode: role as UtilisateurCourant['roleCode'],
    };
    request.utilisateur = utilisateur;
    return true;
  }
}
