/**
 * PermissionsRoleService - Configure les droits par rôle.
 *
 * L'administrateur de l'établissement peut :
 *   - Lister les rôles de son établissement avec leurs services accordés
 *   - Accorder / révoquer l'accès à un service pour un rôle entier
 *   - Activer / désactiver l'accès au portail pour un rôle
 *
 * Règles :
 *   - L'administrateur a toujours accès implicite à tout (non modifiable)
 *   - super_admin n'a pas de tenant, pas concerné par ces droits
 *   - Seuls les rôles présents dans role_etablissements pour cet établissement
 *     + les rôles globaux (tenantId null) sont configurables
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EtablissementsRefService } from '../etablissements-ref/etablissements-ref.service';
import { AccesCacheService } from './acces-cache.service';

const ROLE_ADMIN = 'administrateur';

@Injectable()
export class PermissionsRoleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ref: EtablissementsRefService,
    private readonly cache: AccesCacheService,
  ) {}

  // ── Lister les rôles et leurs droits ─────────────────────────────────

  async listerRolesAvecDroits(acteurUuid: string) {
    const { etab, tenantId } = await this.contexteAdmin(acteurUuid);

    // Rôles disponibles : globaux (tenantId null) + ceux de cet établissement
    const roles = await this.dataSource.query(
      `SELECT r.uuid, r.code, r.libelle, r."familleAuth", r."estPersonnalise", r."peutVoirPortail",
              COUNT(DISTINCT rse.etablissement_services_id)::int AS "nbServicesAccordes"
         FROM "identite"."role" r
         LEFT JOIN "identite"."role_services_etablissement" rse
           ON rse.role_id = r.id
           AND rse.etablissement_services_id IN (
             SELECT es.id FROM "identite"."etablissement_services" es
              WHERE es.etablissement_id = $1
           )
        WHERE r.code <> 'super_admin'
          AND (r."tenantId" IS NULL OR r."tenantId" = $2)
        GROUP BY r.uuid, r.code, r.libelle, r."familleAuth", r."estPersonnalise", r."peutVoirPortail"
        ORDER BY r."estPersonnalise" ASC, r.libelle ASC`,
      [etab.id, tenantId],
    );

    return { etablissement: { uuid: etab.uuid, nom: etab.nom }, roles };
  }

  // ── Droits d'un rôle sur les services ────────────────────────────────

  async droitsRoleSurServices(acteurUuid: string, roleUuid: string) {
    const { etab } = await this.contexteAdmin(acteurUuid);

    const roleRows = await this.dataSource.query(
      `SELECT id, code, libelle, "peutVoirPortail" FROM "identite"."role" WHERE uuid = $1`,
      [roleUuid],
    );
    const role = roleRows[0];
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });
    if (role.code === ROLE_ADMIN) throw new ForbiddenException({ code: 'ADMIN_DROITS_IMPLICITES', message: "L'administrateur dispose toujours de tous les droits." });

    const services = await this.dataSource.query(
      `SELECT s.uuid, s.code, s.nom, s.description,
              (es.status = 'active' AND s.status = 'active') AS actif,
              EXISTS (
                SELECT 1 FROM "identite"."role_services_etablissement" rse
                 WHERE rse.role_id = $2 AND rse.etablissement_services_id = es.id
              ) AS accorde
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        WHERE es.etablissement_id = $1
        ORDER BY s.nom`,
      [etab.id, role.id],
    );

    return {
      role: { uuid: roleUuid, code: role.code, libelle: role.libelle, peutVoirPortail: role.peutVoirPortail },
      services,
    };
  }

  // ── Définir l'accès d'un rôle à un service ───────────────────────────

  async definirAccesRoleService(
    acteurUuid: string,
    roleUuid: string,
    serviceUuid: string,
    accorde: boolean,
  ) {
    const { etab, tenantId } = await this.contexteAdmin(acteurUuid);

    const roleRows = await this.dataSource.query(
      `SELECT id, code FROM "identite"."role" WHERE uuid = $1`, [roleUuid],
    );
    const role = roleRows[0];
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });
    if (role.code === ROLE_ADMIN) throw new ForbiddenException({ code: 'ADMIN_DROITS_IMPLICITES', message: "L'administrateur dispose toujours de tous les droits." });

    // Résoudre l'assignation etablissement_services
    const esRows = await this.dataSource.query(
      `SELECT es.id FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        WHERE es.etablissement_id = $1 AND s.uuid = $2`,
      [etab.id, serviceUuid],
    );
    if (!esRows[0]) throw new NotFoundException({ code: 'SERVICE_NON_ASSIGNE', message: "Ce service n'est pas assigné à votre établissement." });
    const esId = esRows[0].id;

    if (accorde) {
      await this.dataSource.query(
        `INSERT INTO "identite"."role_services_etablissement" ("role_id","etablissement_services_id")
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [role.id, esId],
      );
    } else {
      await this.dataSource.query(
        `DELETE FROM "identite"."role_services_etablissement"
          WHERE role_id = $1 AND etablissement_services_id = $2`,
        [role.id, esId],
      );
    }

    await this.cache.invaliderTenant(tenantId);
    return { code: accorde ? 'ACCES_ACCORDE' : 'ACCES_REVOQUE', roleUuid, serviceUuid, accorde };
  }

  // ── Accès au portail ──────────────────────────────────────────────────

  async definirAccesPortail(acteurUuid: string, roleUuid: string, peutVoirPortail: boolean) {
    const { tenantId } = await this.contexteAdmin(acteurUuid);

    const roleRows = await this.dataSource.query(
      `SELECT id, code FROM "identite"."role" WHERE uuid = $1`, [roleUuid],
    );
    const role = roleRows[0];
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });
    if (role.code === ROLE_ADMIN) throw new ForbiddenException({ code: 'ADMIN_PORTAIL_IMPLICITE', message: "L'administrateur voit toujours le portail." });
    if (role.code === 'super_admin') throw new ForbiddenException({ code: 'SUPER_ADMIN_NON_MODIFIABLE', message: 'Le super admin ne peut pas être modifié.' });

    await this.dataSource.query(
      `UPDATE "identite"."role" SET "peutVoirPortail" = $1 WHERE id = $2`,
      [peutVoirPortail, role.id],
    );

    await this.cache.invaliderTenant(tenantId);
    return { code: 'PORTAIL_MIS_A_JOUR', roleUuid, peutVoirPortail };
  }

  // ── Helper ────────────────────────────────────────────────────────────

  private async contexteAdmin(acteurUuid: string) {
    const rows = await this.dataSource.query(
      `SELECT u.id, u."tenantId", r.code AS "roleCode"
         FROM "identite"."utilisateur" u
         JOIN "identite"."role" r ON r.id = u.role_id
        WHERE u.uuid = $1`,
      [acteurUuid],
    );
    const u = rows[0];
    if (!u || u.roleCode !== ROLE_ADMIN || !u.tenantId) {
      throw new ForbiddenException({ code: 'ACCES_REFUSE', message: "Action réservée à l'administrateur de l'établissement." });
    }
    const etab = await this.ref.trouverParUuid(u.tenantId);
    if (!etab || etab.statut !== 'actif') {
      throw new ForbiddenException({ code: 'ETABLISSEMENT_INACTIF', message: "Votre établissement n'est pas actif." });
    }
    return { etab, tenantId: u.tenantId as string };
  }
}
