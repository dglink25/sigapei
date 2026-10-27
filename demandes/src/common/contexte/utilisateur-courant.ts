import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Utilisateur authentifie (jeton verifie par Identite, ou contexte Gateway avec secret interne). */
export interface UtilisateurCourant {
  uuid: string;
  /** tenant_id numerique de l'etablissement (resolu depuis l'uuid si besoin). */
  tenantId: number;
  /** Code du role : role systeme ou role personnalise de l'etablissement. */
  roleCode: string;
}

export const ROLES_SYSTEME = ['super_admin', 'administrateur', 'personnel', 'enseignant', 'apprenant', 'parent'] as const;

export const Utilisateur = createParamDecorator((_: unknown, ctx: ExecutionContext): UtilisateurCourant => {
  return ctx.switchToHttp().getRequest().utilisateur;
});
