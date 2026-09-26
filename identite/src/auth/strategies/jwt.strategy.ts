import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PayloadJwt } from '../../jetons/jetons.types';
import { TokenBlacklistRedis } from '../../jetons/token-blacklist.redis';
import { UtilisateursService } from '../../utilisateurs/utilisateurs.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly blacklist: TokenBlacklistRedis,
    private readonly utilisateursService: UtilisateursService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
      issuer: config.get<string>('jwt.issuer'),
    });
  }

  async validate(payload: PayloadJwt) {
    if (await this.blacklist.estRevoque(payload.jti)) {
      throw new UnauthorizedException({ code: 'JETON_REVOQUE', message: 'Ce jeton a ete revoque.' });
    }
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(payload.sub).catch(() => null);
    if (!utilisateur) {
      throw new UnauthorizedException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });
    }
    return {
      sub: payload.sub,
      utilisateurId: utilisateur.id,
      tenantId: payload.tenantId,
      roleCode: payload.roleCode,
      familleAuth: payload.familleAuth,
      jti: payload.jti,
    };
  }
}
