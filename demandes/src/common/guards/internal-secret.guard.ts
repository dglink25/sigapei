import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { egalTempsConstant, secretValide } from '../secret.util';

/**
 * Protege les endpoints /interne/* : appeles uniquement par la passerelle API
 * ou par un autre microservice via le header X-Internal-Secret partage (Regle n°3).
 * Fail closed : secret non configure => 503, secret absent ou faux => 401.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const attendu = this.config.get<string>('internalApiSecret');
    const recu = request.headers['x-internal-secret'];

    if (!secretValide(attendu)) {
      throw new ServiceUnavailableException({
        code: 'CONFIG_SECURITE_INVALIDE',
        message: 'Service momentanement indisponible.',
      });
    }

    if (typeof recu !== 'string' || !egalTempsConstant(attendu, recu)) {
      throw new UnauthorizedException({
        code: 'SECRET_INTERNE_INVALIDE',
        message: 'Acces reserve aux services internes de la plateforme.',
      });
    }

    return true;
  }
}
