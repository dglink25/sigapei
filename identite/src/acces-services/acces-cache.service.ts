import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Cache des droits d'acces dans Redis (prefixe "identite:" ajoute par ioredis).
 * Invalidation par compteur de version : un INCR rend instantanement obsolete toutes les entrees
 * d'un etablissement (ou du catalogue), sans SCAN ni suppression de cles. Le TTL (60 s) borne
 * en plus tout changement fait hors de ce microservice (ex: suspension d'un etablissement).
 * Une panne Redis ne casse jamais l'acces : on recalcule depuis PostgreSQL.
 */
@Injectable()
export class AccesCacheService {
  private readonly logger = new Logger(AccesCacheService.name);
  private static readonly TTL_SECONDES = 60;

  constructor(private readonly redis: RedisService) {}

  async obtenir<T>(tenantId: string, cleSuffixe: string, calculer: () => Promise<T>): Promise<T> {
    let cle: string | null = null;
    try {
      // La version est lue AVANT le calcul : une invalidation concurrente rend l'ecriture inoffensive.
      const [g, t] = await this.redis.client.mget('acces:v:g', `acces:v:t:${tenantId}`);
      cle = `acces:${g ?? 0}.${t ?? 0}:${cleSuffixe}`;
      const enCache = await this.redis.getJson<T>(cle);
      if (enCache) return enCache;
    } catch (err) {
      this.logger.warn(`Cache acces indisponible (lecture) : ${(err as Error).message}`);
    }
    const valeur = await calculer();
    if (cle) {
      try {
        await this.redis.setJson(cle, valeur, AccesCacheService.TTL_SECONDES);
      } catch (err) {
        this.logger.warn(`Cache acces indisponible (ecriture) : ${(err as Error).message}`);
      }
    }
    return valeur;
  }

  async invaliderTenant(tenantUuid: string): Promise<void> {
    try {
      await this.redis.client.incr(`acces:v:t:${tenantUuid}`);
    } catch (err) {
      this.logger.warn(`Invalidation cache impossible : ${(err as Error).message}`);
    }
  }

  async invaliderGlobal(): Promise<void> {
    try {
      await this.redis.client.incr('acces:v:g');
    } catch (err) {
      this.logger.warn(`Invalidation cache impossible : ${(err as Error).message}`);
    }
  }
}
