import { DataSource } from 'typeorm';
import { FamilleAuth, Role, ROLES_SYSTEME } from './role.entity';

/** Charge les 6 roles systeme (non supprimables) s'ils n'existent pas deja. */
export async function seedRolesSysteme(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Role);
  const familleParRole: Record<(typeof ROLES_SYSTEME)[number], FamilleAuth> = {
    super_admin: FamilleAuth.SUPER_ADMIN,
    administrateur: FamilleAuth.PERSONNEL_ADMIN,
    personnel: FamilleAuth.PERSONNEL_ADMIN,
    enseignant: FamilleAuth.PERSONNEL_ADMIN,
    apprenant: FamilleAuth.PARENT_APPRENANT,
    parent: FamilleAuth.PARENT_APPRENANT,
  };

  for (const code of ROLES_SYSTEME) {
    const existant = await repo.findOne({ where: { code } });
    if (!existant) {
      await repo.save(
        repo.create({
          code,
          libelle: code.charAt(0).toUpperCase() + code.slice(1).replace('_', ' '),
          familleAuth: familleParRole[code],
          estPersonnalise: false,
          tenantId: null,
        }),
      );
    }
  }
}
