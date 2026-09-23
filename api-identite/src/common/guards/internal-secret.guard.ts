import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protege les endpoints /interne/* : reserves a la passerelle API (Gateway)
 * et au back-office, jamais appeles directement par un client final.
 * Authentification par secret partage (header X-Internal-Secret), distincte
 * du JWT utilisateur puisque la Gateway introspecte des jetons d'autrui.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-internal-secret'];
    const attendu = this.config.get<string>('internalApiSecret');
    if (!attendu || secret !== attendu) {
      throw new UnauthorizedException({
        code: 'SECRET_INTERNE_INVALIDE',
        message: 'Acces reserve aux services internes de la plateforme.',
      });
    }
    return true;
  }
}
