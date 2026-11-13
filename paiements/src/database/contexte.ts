import { DataSource, EntityManager } from 'typeorm';

/**
 * Contexte d'accès appliqué à CHAQUE transaction : alimente l'isolation par établissement (RLS PostgreSQL).
 *  - 'super_admin' / 'systeme' : voient tous les établissements (le système sert aux tâches de fond).
 *  - autres rôles : limités à etablissementUuid.
 */
export interface ContexteAcces {
  role: 'super_admin' | 'systeme' | 'administrateur' | 'utilisateur';
  etablissementUuid?: string | null;
  /** Rôle PostgreSQL sans droit de propriétaire (docs/roles.sql) : sans lui, la RLS ne s'applique pas au propriétaire. */
  roleBase?: string;
}

const NOM_ROLE = /^[a-z_][a-z0-9_]*$/;

export async function avecContexte<T>(ds: DataSource, ctx: ContexteAcces, fn: (m: EntityManager) => Promise<T>): Promise<T> {
  return ds.transaction(async (m) => {
    const roleBase = ctx.roleBase ?? process.env.DB_ROLE_APPLICATIF;
    if (roleBase) {
      if (!NOM_ROLE.test(roleBase)) throw new Error('Nom de role PostgreSQL invalide');
      await m.query(`SET LOCAL ROLE "${roleBase}"`);
    }
    await m.query(`SELECT set_config('app.role', $1, true), set_config('app.etablissement', $2, true)`, [
      ctx.role, ctx.etablissementUuid ?? '',
    ]);
    return fn(m);
  });
}
