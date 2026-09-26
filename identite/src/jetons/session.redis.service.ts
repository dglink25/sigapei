import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SessionActive } from './jetons.types';

/**
 * Toutes les sessions actives (couple access/refresh) vivent dans Redis,
 * cle par jti, avec un TTL = duree du refresh token. Cela garde PostgreSQL
 * reserve a l'audit/aux donnees durables et rend la lecture/ecriture de
 * session quasi instantanee, meme en pic de charge.
 */
@Injectable()
export class SessionRedisService {
  constructor(private readonly redis: RedisService) {}

  private cleSession(jti: string): string {
    return `session:${jti}`;
  }

  private cleIndexUtilisateur(utilisateurUuid: string): string {
    return `session:utilisateur:${utilisateurUuid}`;
  }

  async enregistrer(jti: string, session: SessionActive, ttlSeconds: number): Promise<void> {
    await this.redis.setJson(this.cleSession(jti), session, ttlSeconds);
    await this.redis.addToSet(this.cleIndexUtilisateur(session.utilisateurUuid), jti, ttlSeconds);
  }

  async recuperer(jti: string): Promise<SessionActive | null> {
    return this.redis.getJson<SessionActive>(this.cleSession(jti));
  }

  async revoquer(jti: string): Promise<void> {
    await this.redis.del(this.cleSession(jti));
  }

  async listerSessionsUtilisateur(utilisateurUuid: string): Promise<string[]> {
    return this.redis.client.smembers(this.cleIndexUtilisateur(utilisateurUuid));
  }
}
