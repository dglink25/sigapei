import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { DependanceIndisponible } from '../erreurs/erreurs';

export type Service = 'identite' | 'etablissements' | 'scolarite' | 'evaluations' | 'rh' | 'finances';

/**
 * Appels /v1/interne/* vers les autres microservices (Regle n°1 : jamais de jointure SQL inter-schemas ;
 * Regle n°3 : en-tete X-Internal-Secret). Timeout court, 2 nouvelles tentatives sur erreur reseau.
 * Toute indisponibilite => DependanceIndisponible (503) : on ne decide jamais "au hasard".
 * 404 => null (ressource absente), a interpreter par l'appelant.
 */
@Injectable()
export class HttpInterneService {
  private readonly logger = new Logger(HttpInterneService.name);

  constructor(private readonly config: ConfigService) {}

  async get<T = any>(service: Service, chemin: string, params: Record<string, unknown> = {}, tenantId?: number): Promise<T | null> {
    const base = String(this.config.get(`services.${service}`) ?? '').replace(/\/+$/, '');
    const entetes: Record<string, string> = {
      'X-Internal-Secret': String(this.config.get('internalApiSecret') ?? ''),
      Accept: 'application/json',
    };
    if (tenantId !== undefined) entetes['X-Tenant-Id'] = String(tenantId);

    for (let tentative = 0; ; tentative++) {
      try {
        const r = await axios.get(base + chemin, {
          params,
          headers: entetes,
          timeout: this.config.get<number>('services.timeoutMs') ?? 5000,
          validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
        });
        return r.status === 404 ? null : (r.data as T);
      } catch (e) {
        const err = e as AxiosError;
        const reseau = !err.response;
        if (reseau && tentative < 2) {
          await new Promise((ok) => setTimeout(ok, 200));
          continue;
        }
        const detail = `${service} ${chemin} : ${err.response ? 'HTTP ' + err.response.status : (err.code ?? err.message)}`;
        this.logger.error(`[DEPENDANCE_INDISPONIBLE] ${detail}`);
        throw new DependanceIndisponible(detail);
      }
    }
  }
}

/** Extrait la charge utile quelle que soit l'enveloppe ({donnees}, {data} ou racine). */
export function charge<T = any>(corps: any): T | null {
  if (corps === null || corps === undefined) return null;
  if (typeof corps === 'object' && 'donnees' in corps) return corps.donnees as T;
  if (typeof corps === 'object' && 'data' in corps) return corps.data as T;
  return corps as T;
}
