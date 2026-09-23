import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Liste noire des jetons revoques, dans Redis (pas en base durable) :
 * permet une revocation immediate sans attendre l'expiration naturelle du JWT,
 * avec un TTL aligne sur la duree de vie restante du token (auto-nettoyage).
 */
@Injectable()
export class TokenBlacklistRedis {
  constructor(private readonly redis: RedisService) {}

  private cle(jti: string): string {
    return `jwt:revoque:${jti}`;
  }

  async revoquer(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.client.set(this.cle(jti), '1', 'EX', Math.max(ttlSeconds, 1));
  }

  async estRevoque(jti: string): Promise<boolean> {
    return this.redis.exists(this.cle(jti));
  }
}
