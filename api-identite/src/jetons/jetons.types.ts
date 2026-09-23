export interface PayloadJwt {
  sub: string; // uuid utilisateur
  tenantId: string | null;
  roleCode: string;
  familleAuth: string;
  jti: string;
}

export interface SessionActive {
  utilisateurUuid: string;
  appareilUuid: string;
  refreshTokenHash: string;
  creeLe: string;
  expireLe: string;
}
