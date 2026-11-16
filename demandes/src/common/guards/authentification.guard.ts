import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ROUTE_SANS_CONTEXTE } from '../decorators/public.decorator';
import { egalTempsConstant, secretValide } from '../secret.util';
import { ErreurMetier } from '../erreurs/erreurs';
import { HttpStatus } from '@nestjs/common';
import { UtilisateurCourant } from '../contexte/utilisateur-courant';
import { IdentiteClient } from '../../integrations/identite.client';
import { EtablissementsClient } from '../../integrations/etablissements.client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Code de role : role systeme ou role personnalise cree par l'etablissement dans Identite. */
const CODE_ROLE = /^[a-z][a-z0-9_-]{1,63}$/;

const refus = (statut: HttpStatus, code: string, message: string) => new ErreurMetier(statut, code, message);

/**
 * Garde globale : QUI appelle ? Les deux voies de la regle n°5 du README plateforme, jamais une troisieme.
 *
 * 1. Front, appel direct : Authorization: Bearer <jeton Identite>. Le jeton est verifie PAR Identite
 *    (introspection) ; le contexte vient uniquement de sa reponse, jamais d'en-tetes du navigateur.
 * 2. Gateway : X-Internal-Secret + X-Tenant-Id (id ou uuid) + X-User-Id + X-User-Role. Sans secret
 *    valide, ces en-tetes ne valent rien.
 *
 * Puis, dans les deux cas : l'utilisateur doit avoir acces au module dans Identite (role autorise et
 * service active pour son etablissement). Tout role est admis, y compris les roles personnalises :
 * ce qu'il peut GERER est ensuite decide par la grille de permissions du module (GouvernanceService).
 * Toute anomalie => refus ; dependance injoignable => 503.
 */
@Injectable()
export class AuthentificationGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly identite: IdentiteClient,
    private readonly etablissements: EtablissementsClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(ROUTE_SANS_CONTEXTE, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const requete = context.switchToHttp().getRequest();
    const attendu = this.config.get<string>('internalApiSecret');
    if (!secretValide(attendu)) {
      throw new ServiceUnavailableException({
        code: 'CONFIG_SECURITE_INVALIDE',
        message: 'Service momentanément indisponible.',
      });
    }

    let tenantRef: string | null;
    let uuid: string;
    let role: string;

    const secret = requete.headers['x-internal-secret'];
    if (typeof secret === 'string' && secret !== '') {
      if (!egalTempsConstant(attendu, secret)) {
        throw refus(HttpStatus.UNAUTHORIZED, 'APPEL_NON_AUTORISE', 'Accès refusé.');
      }
      tenantRef = String(requete.headers['x-tenant-id'] ?? '');
      uuid = String(requete.headers['x-user-id'] ?? '').toLowerCase();
      role = String(requete.headers['x-user-role'] ?? '');
    } else {
      const autorisation = String(requete.headers['authorization'] ?? '');
      const m = /^Bearer\s+(\S{1,4096})$/i.exec(autorisation);
      if (!m) {
        throw refus(HttpStatus.UNAUTHORIZED, 'APPEL_NON_AUTORISE', 'Vous devez être connecté pour accéder à cette ressource.');
      }
      const ctx = await this.identite.introspecter(m[1]);
      if (!ctx) throw refus(HttpStatus.UNAUTHORIZED, 'JETON_INVALIDE', 'Session invalide ou expirée. Reconnectez-vous.');
      tenantRef = ctx.tenantId;
      uuid = ctx.sub.toLowerCase();
      role = ctx.roleCode;
    }

    if (!UUID.test(uuid)) {
      throw refus(HttpStatus.UNAUTHORIZED, 'NON_AUTHENTIFIE', 'Vous devez être connecté pour accéder à cette ressource.');
    }
    if (!CODE_ROLE.test(role) || role === 'super_admin') {
      throw refus(HttpStatus.FORBIDDEN, 'ROLE_INVALIDE', "Votre compte ne dispose pas d'un rôle autorisé dans ce module.");
    }
    const tenantId = await this.etablissements.resoudre(tenantRef);
    if (tenantId === null) {
      throw refus(HttpStatus.UNAUTHORIZED, 'TENANT_MANQUANT', 'Contexte établissement manquant ou invalide.');
    }
    if (!(await this.identite.accesModule(uuid))) {
      throw refus(HttpStatus.FORBIDDEN, 'MODULE_NON_AUTORISE', "Ce service n'est pas ouvert à votre profil dans votre établissement.");
    }

    const utilisateur: UtilisateurCourant = { uuid, tenantId, roleCode: role };
    requete.utilisateur = utilisateur;
    return true;
  }
}
