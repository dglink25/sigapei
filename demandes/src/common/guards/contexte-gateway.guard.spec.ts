import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ContexteGatewayGuard } from './contexte-gateway.guard';

const SECRET = 'a'.repeat(40);
const UUID = '3f1c2b9e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';

function ctx(headers: Record<string, string>, sansContexte = false) {
  const request: any = { headers };
  const reflector = { getAllAndOverride: () => sansContexte } as unknown as Reflector;
  const context = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, reflector, context };
}

function guard(secret: string | undefined, reflector: Reflector) {
  const config = { get: () => secret } as unknown as ConfigService;
  return new ContexteGatewayGuard(config, reflector);
}

const valides = {
  'x-internal-secret': SECRET,
  'x-tenant-id': '12',
  'x-user-id': UUID,
  'x-user-role': 'administrateur',
};

describe('ContexteGatewayGuard', () => {
  it('accepte un contexte complet et l attache a la requete', () => {
    const { request, reflector, context } = ctx({ ...valides });
    expect(guard(SECRET, reflector).canActivate(context)).toBe(true);
    expect(request.utilisateur).toEqual({ uuid: UUID, tenantId: 12, roleCode: 'administrateur' });
  });

  it('refuse des en-tetes de contexte sans secret interne (falsification)', () => {
    const { reflector, context } = ctx({ ...valides, 'x-internal-secret': '' });
    expect(() => guard(SECRET, reflector).canActivate(context)).toThrow();
  });

  it('refuse un mauvais secret', () => {
    const { reflector, context } = ctx({ ...valides, 'x-internal-secret': 'b'.repeat(40) });
    expect(() => guard(SECRET, reflector).canActivate(context)).toThrow();
  });

  it('refuse si le secret serveur est absent, placeholder ou trop court', () => {
    for (const s of [undefined, 'change-me', 'court']) {
      const { reflector, context } = ctx({ ...valides });
      expect(() => guard(s, reflector).canActivate(context)).toThrow();
    }
  });

  it.each([
    ['x-tenant-id', 'abc'],
    ['x-tenant-id', '0'],
    ['x-user-id', 'pas-un-uuid'],
    ['x-user-role', 'dieu'],
  ])('refuse %s = %s', (cle, valeur) => {
    const { reflector, context } = ctx({ ...valides, [cle]: valeur });
    expect(() => guard(SECRET, reflector).canActivate(context)).toThrow();
  });

  it('laisse passer une route marquee sans contexte utilisateur', () => {
    const { reflector, context } = ctx({}, true);
    expect(guard(SECRET, reflector).canActivate(context)).toBe(true);
  });
});
