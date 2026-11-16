import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CacheMemoire } from '../common/cache/cache-memoire';
import { DependanceIndisponible } from '../common/erreurs/erreurs';
import { HttpInterneService } from '../common/http/http-interne.service';

export interface ContexteJeton {
  sub: string;
  tenantId: string | null;
  roleCode: string;
}

/**
 * Identite (Regle n°5, cas 2 : appel direct du front sans Gateway).
 *  - introspection du jeton : signature, expiration, revocation, session — verifiees PAR Identite ;
 *  - acces au module : le role de l'utilisateur a-t-il ce service, et l'etablissement l'a-t-il active ?
 * Cache : jeton valide 60 s, jeton refuse 10 s (cle = empreinte SHA-256, jamais le jeton lui-meme).
 */
@Injectable()
export class IdentiteClient {
  private readonly logger = new Logger(IdentiteClient.name);
  private readonly jetons = new CacheMemoire<ContexteJeton | null>();
  private readonly acces = new CacheMemoire<boolean>();
  private static readonly DUREE_MS = 60_000;

  constructor(
    private readonly http: HttpInterneService,
    private readonly config: ConfigService,
  ) {}

  async introspecter(jeton: string): Promise<ContexteJeton | null> {
    const cle = createHash('sha256').update(jeton).digest('hex');
    const enCache = this.jetons.lire(cle);
    if (enCache !== undefined) return enCache;

    const d = await this.http.get('identite', '/v1/interne/introspection', {
      token: jeton,
    });
    if (!d || typeof d !== 'object' || !('valide' in d)) {
      throw new DependanceIndisponible('Introspection Identite : champ `valide` absent.');
    }
    if (d.valide !== true) {
      // Refus memorise 10 s : un flot de faux jetons ne se repercute pas sur Identite.
      this.jetons.ecrire(cle, null, 10_000);
      return null;
    }
    if (typeof d.sub !== 'string' || typeof d.roleCode !== 'string' || !('tenantId' in d)) {
      throw new DependanceIndisponible('Introspection Identite : sub, roleCode ou tenantId absent.');
    }

    const contexte: ContexteJeton = {
      sub: d.sub,
      tenantId: d.tenantId === null ? null : String(d.tenantId),
      roleCode: d.roleCode,
    };
    this.jetons.ecrire(cle, contexte, IdentiteClient.DUREE_MS);
    return contexte;
  }

  /** L'utilisateur a-t-il acces a ce module (role autorise + service active pour l'etablissement) ? */
  async accesModule(utilisateurUuid: string): Promise<boolean> {
    const enCache = this.acces.lire(utilisateurUuid);
    if (enCache !== undefined) return enCache;

    const code = this.config.get<string>('codeService') ?? 'demandes';
    const d = await this.http.get('identite', '/v1/interne/acces', {
      utilisateurUuid,
      serviceCode: code,
    });
    if (!d || typeof d.autorise !== 'boolean') {
      throw new DependanceIndisponible('Acces Identite : champ `autorise` absent.');
    }
    if (!d.autorise) this.logger.warn(`Acces refuse au module ${code} : ${d.motif ?? 'SERVICE_NON_AUTORISE'}`);
    this.acces.ecrire(utilisateurUuid, d.autorise, IdentiteClient.DUREE_MS);
    return d.autorise;
  }
}
