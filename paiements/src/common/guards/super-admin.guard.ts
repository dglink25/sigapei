/**
 * Guard super_admin : s'appuie sur JwtGuard (doit être exécuté avant).
 * Refuse toute requête dont le roleCode n'est pas 'super_admin'.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const role = (req as unknown as Record<string, unknown>).roleCode as string ?? '';
    if (role !== 'super_admin') {
      throw new ForbiddenException({ code: 'SUPER_ADMIN_REQUIS', message: 'Cette action est réservée au super administrateur.' });
    }
    return true;
  }
}
