import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Meme contrat que InternalSecretGuard (header X-Internal-Secret), avec comparaison en temps constant. */
@Injectable()
export class InternalSecretSafeGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const recu = context.switchToHttp().getRequest().headers['x-internal-secret'];
    const attendu = this.config.get<string>('internalApiSecret');
    const empreinte = (v: string) => createHash('sha256').update(v).digest();
    if (!attendu || typeof recu !== 'string' || !timingSafeEqual(empreinte(recu), empreinte(attendu))) {
      throw new UnauthorizedException({
        code: 'SECRET_INTERNE_INVALIDE',
        message: 'Acces reserve aux services internes de la plateforme.',
      });
    }
    return true;
  }
}
