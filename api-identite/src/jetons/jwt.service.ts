import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PayloadJwt } from './jetons.types';

@Injectable()
export class JwtEmissionService {
  constructor(private readonly jwt: NestJwtService, private readonly config: ConfigService) {}

  async emettreAccessToken(payload: Omit<PayloadJwt, 'jti'>): Promise<{ token: string; jti: string }> {
    const jti = uuidv4();
    const token = await this.jwt.signAsync(
      { ...payload, jti },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessTtl'),
        issuer: this.config.get<string>('jwt.issuer'),
      },
    );
    return { token, jti };
  }

  async emettreRefreshToken(sub: string, jti: string): Promise<string> {
    return this.jwt.signAsync(
      { sub, jti, type: 'refresh' },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl'),
        issuer: this.config.get<string>('jwt.issuer'),
      },
    );
  }

  async verifierRefreshToken(token: string): Promise<{ sub: string; jti: string }> {
    return this.jwt.verifyAsync(token, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      issuer: this.config.get<string>('jwt.issuer'),
    });
  }
}
