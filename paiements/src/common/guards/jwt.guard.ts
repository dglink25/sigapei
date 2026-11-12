/**
 * Guard JWT : vérifie le token Access émis par le microservice Identité.
 * Injecte { utilisateurUuid, roleCode } dans req.user après vérification.
 * Utilise le même secret JWT_ACCESS_SECRET que le microservice Identité.
 */
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

function base64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function verifierHmacSha256(payload: string, signature: Buffer, secret: string): boolean {
  const attendu = crypto.createHmac('sha256', secret).update(payload).digest();
  if (attendu.length !== signature.length) return false;
  return crypto.timingSafeEqual(attendu, signature);
}

export interface JwtPayload {
  sub: string;         // UUID utilisateur
  roleCode?: string;
  role?: string;
  etablissementUuid?: string;
  iss?: string;
  exp?: number;
}

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const s = config.get<string>('jwt.accessSecret');
    if (!s) throw new Error('JWT_ACCESS_SECRET manquant');
    this.secret = s;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extraireToken(req);
    if (!token) throw new UnauthorizedException({ code: 'TOKEN_MANQUANT', message: 'Token d\'accès requis.' });

    const payload = this.verifier(token);

    // Injecter sur req pour les controllers
    (req as unknown as Record<string, unknown>).utilisateurUuid = payload.sub;
    (req as unknown as Record<string, unknown>).roleCode = payload.roleCode ?? payload.role ?? '';
    (req as unknown as Record<string, unknown>).etablissementUuid = payload.etablissementUuid ?? null;

    return true;
  }

  private extraireToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }

  private verifier(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException({ code: 'TOKEN_INVALIDE' });

    const [headerB64, payloadB64, sigB64] = parts;
    const signature = base64urlDecode(sigB64);
    const sigPayload = `${headerB64}.${payloadB64}`;

    if (!verifierHmacSha256(sigPayload, signature, this.secret)) {
      throw new UnauthorizedException({ code: 'TOKEN_SIGNATURE_INVALIDE', message: 'Token invalide.' });
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
    } catch {
      throw new UnauthorizedException({ code: 'TOKEN_MALFORME' });
    }

    if (!payload.exp || Date.now() / 1000 > payload.exp) {
      throw new UnauthorizedException({ code: 'TOKEN_EXPIRE', message: 'Token expiré.' });
    }

    return payload;
  }
}
