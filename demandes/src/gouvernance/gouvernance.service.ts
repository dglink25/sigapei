import { HttpStatus, Injectable } from '@nestjs/common';
import { Base } from '../common/base/base.service';
import { UtilisateurCourant } from '../common/contexte/utilisateur-courant';
import { ErreurMetier } from '../common/erreurs/erreurs';
import { Action, ACTIONS, LISTE_ACTIONS, ROLE_ADMINISTRATEUR } from './actions';
import { DefinirPermissionsDto } from './dto/definir-permissions.dto';

const CODE_ROLE = /^[a-z][a-z0-9_-]{1,63}$/;

/**
 * Qui peut GERER le module (CDC §5) : jamais un intitule de role dans le code, toujours la grille
 * role x action configuree par l'etablissement. Seule regle fixe : l'administrateur peut tout.
 */
@Injectable()
export class GouvernanceService {
  constructor(private readonly base: Base) {}

  async peut(u: UtilisateurCourant, action: Action): Promise<boolean> {
    if (u.roleCode === ROLE_ADMINISTRATEUR) return true;
    return !!(await this.base.ligne(`SELECT 1 FROM demandes.permissions_role WHERE tenant_id = $1 AND role_code = $2 AND action = $3`, [
      u.tenantId,
      u.roleCode,
      action,
    ]));
  }

  async exiger(u: UtilisateurCourant, action: Action): Promise<void> {
    if (!(await this.peut(u, action))) {
      throw new ErreurMetier(HttpStatus.FORBIDDEN, 'ACTION_NON_AUTORISEE', `Action réservée : ${ACTIONS[action]}.`);
    }
  }

  /** Categories de reclamations que le role peut traiter (null = toutes). */
  async categoriesReclamation(u: UtilisateurCourant): Promise<string[] | null> {
    if (u.roleCode === ROLE_ADMINISTRATEUR) return null;
    const r = await this.base.ligne<{
      perimetre: { categories?: string[] } | null;
    }>(`SELECT perimetre FROM demandes.permissions_role WHERE tenant_id = $1 AND role_code = $2 AND action = 'repondre_reclamation'`, [
      u.tenantId,
      u.roleCode,
    ]);
    if (!r) return [];
    return r.perimetre?.categories?.length ? r.perimetre.categories : null;
  }

  async mesActions(u: UtilisateurCourant): Promise<string[]> {
    if (u.roleCode === ROLE_ADMINISTRATEUR) return [...LISTE_ACTIONS];
    const r = await this.base.lignes<{ action: string }>(
      `SELECT action FROM demandes.permissions_role WHERE tenant_id = $1 AND role_code = $2 ORDER BY action`,
      [u.tenantId, u.roleCode],
    );
    return r.map((x) => x.action);
  }

  async grille(u: UtilisateurCourant) {
    const lignes = await this.base.lignes<{
      role_code: string;
      action: string;
      perimetre: unknown;
    }>(`SELECT role_code, action, perimetre FROM demandes.permissions_role WHERE tenant_id = $1 ORDER BY role_code, action`, [u.tenantId]);
    const roles: Record<string, { action: string; perimetre: unknown }[]> = {};
    for (const l of lignes)
      (roles[l.role_code] ??= []).push({
        action: l.action,
        perimetre: l.perimetre,
      });
    return {
      actions: LISTE_ACTIONS.map((code) => ({ code, libelle: ACTIONS[code] })),
      roles: Object.entries(roles).map(([role_code, permissions]) => ({
        role_code,
        permissions,
      })),
      administrateur: {
        role_code: ROLE_ADMINISTRATEUR,
        toutes_les_actions: true,
      },
    };
  }

  exigerAdministrateur(u: UtilisateurCourant): void {
    if (u.roleCode !== ROLE_ADMINISTRATEUR) {
      throw new ErreurMetier(
        HttpStatus.FORBIDDEN,
        'ACTION_NON_AUTORISEE',
        "Seul l'administrateur de l'établissement configure les permissions.",
      );
    }
  }

  async definir(u: UtilisateurCourant, roleCode: string, dto: DefinirPermissionsDto) {
    this.exigerAdministrateur(u);
    if (!CODE_ROLE.test(roleCode) || roleCode === ROLE_ADMINISTRATEUR || roleCode === 'super_admin') {
      throw ErreurMetier.invalide('role_code', "Ce rôle ne peut pas être configuré (l'administrateur dispose de toutes les actions).");
    }
    const actions = dto.permissions.map((p) => p.action);
    if (new Set(actions).size !== actions.length) throw ErreurMetier.invalide('permissions', 'Une action est listée deux fois.');
    for (const p of dto.permissions) {
      if (p.perimetre?.categories && p.action !== 'repondre_reclamation') {
        throw ErreurMetier.invalide('permissions', 'Un périmètre par catégorie ne concerne que les réclamations.');
      }
    }

    return this.base.transaction(async (ex) => {
      const avant = await this.base.lignes(
        `SELECT action, perimetre FROM demandes.permissions_role WHERE tenant_id = $1 AND role_code = $2 ORDER BY action`,
        [u.tenantId, roleCode],
        ex,
      );
      await ex.query(`DELETE FROM demandes.permissions_role WHERE tenant_id = $1 AND role_code = $2`, [u.tenantId, roleCode]);
      for (const p of dto.permissions) {
        await ex.query(
          `INSERT INTO demandes.permissions_role (tenant_id, role_code, action, perimetre, accorde_par_uuid) VALUES ($1, $2, $3, $4, $5)`,
          [
            u.tenantId,
            roleCode,
            p.action,
            p.perimetre?.categories?.length ? JSON.stringify({ categories: p.perimetre.categories }) : null,
            u.uuid,
          ],
        );
      }
      await this.base.journaliser(ex, u, 'permissions.role.modifiees', 'role', null, {
        role_code: roleCode,
        avant,
        apres: dto.permissions,
      });
      return { role_code: roleCode, permissions: dto.permissions };
    });
  }
}
