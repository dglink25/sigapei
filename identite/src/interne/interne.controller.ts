import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { TokenBlacklistRedis } from '../jetons/token-blacklist.redis';
import { SessionRedisService } from '../jetons/session.redis.service';
import { PayloadJwt } from '../jetons/jetons.types';

/**
 * Endpoint interne consomme exclusivement par la passerelle API (Gateway) :
 * valide un JWT et retourne le contexte utilisateur (sub, role, tenant),
 * conformement au principe "tout transite par la Gateway" (section 16).
 */
@ApiExcludeController()
@UseGuards(InternalSecretGuard)
@Controller('interne')
export class InterneController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistRedis,
    private readonly sessions: SessionRedisService,
  ) {}

  @Get('introspection')
  async introspection(@Query('token') token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<PayloadJwt>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
        issuer: this.config.get<string>('jwt.issuer'),
      });
      if (await this.blacklist.estRevoque(payload.jti)) {
        return { valide: false, motif: 'JETON_REVOQUE' };
      }
      const session = await this.sessions.recuperer(payload.jti);
      if (!session) {
        return { valide: false, motif: 'SESSION_INTROUVABLE' };
      }
      return {
        valide: true,
        sub: payload.sub,
        tenantId: payload.tenantId,
        roleCode: payload.roleCode,
        familleAuth: payload.familleAuth,
      };
    } catch {
      return { valide: false, motif: 'JETON_INVALIDE_OU_EXPIRE' };
    }
  }
}
