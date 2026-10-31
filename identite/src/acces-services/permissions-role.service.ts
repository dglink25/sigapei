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
  BadRequestException,
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

    // Uniquement les rôles explicitement assignés à cet établissement via role_etablissements
    // (système ou personnalisés - tout ce qui a été assigné par le super admin)
    const roles = await this.dataSource.query(
      `SELECT r.uuid, r.code, r.libelle, r."familleAuth", r."estPersonnalise", r."peut_voir_portail" AS "peutVoirPortail",
              (CASE WHEN r."peut_voir_portail" THEN COUNT(DISTINCT rse_droits.etablissement_services_id)::int ELSE 0 END) AS "nbServicesAccordes"
         FROM "identite"."role_etablissements" re
         JOIN "identite"."role" r ON r.id = re.role_id
         LEFT JOIN "identite"."role_services_etablissement" rse_droits
           ON rse_droits.role_id = r.id
           AND rse_droits.etablissement_services_id IN (
             SELECT es.id FROM "identite"."etablissement_services" es
              WHERE es.etablissement_id = $1
           )
        WHERE re.etablissement_id = $1
          AND r.code <> 'super_admin'
        GROUP BY r.uuid, r.code, r.libelle, r."familleAuth", r."estPersonnalise", r."peut_voir_portail"
        ORDER BY r."estPersonnalise" ASC, r.libelle ASC`,
      [etab.id],
    );

    return { etablissement: { uuid: etab.uuid, nom: etab.nom }, roles };
  }

  // ── Droits d'un rôle sur les services ────────────────────────────────

  async droitsRoleSurServices(acteurUuid: string, roleUuid: string) {
    const { etab } = await this.contexteAdmin(acteurUuid);

    const roleRows = await this.dataSource.query(
      `SELECT r.id, r.code, r.libelle, r."peut_voir_portail" AS "peutVoirPortail"
         FROM "identite"."role" r
         JOIN "identite"."role_etablissements" re ON re.role_id = r.id
        WHERE r.uuid = $1 AND re.etablissement_id = $2`,
      [roleUuid, etab.id],
    );
    const role = roleRows[0];
    if (!role) throw new NotFoundException({ code: 'ROLE_NON_ASSIGNE', message: 'Ce rôle n\'est pas assigné à votre établissement.' });
    if (role.code === ROLE_ADMIN) throw new ForbiddenException({ code: 'ADMIN_DROITS_IMPLICITES', message: "L'administrateur dispose toujours de tous les droits." });

    const services = await this.dataSource.query(
      `SELECT s.uuid, s.code, s.nom, s.description,
              (es.status = 'active' AND s.status = 'active') AS actif,
              ($3::boolean AND EXISTS (
                SELECT 1 FROM "identite"."role_services_etablissement" rse
                 WHERE rse.role_id = $2 AND rse.etablissement_services_id = es.id
              )) AS accorde
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        WHERE es.etablissement_id = $1
        ORDER BY s.nom`,
      [etab.id, role.id, Boolean(role.peutVoirPortail)],
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
      `SELECT id, code, "peut_voir_portail" AS "peutVoirPortail" FROM "identite"."role" WHERE uuid = $1`, [roleUuid],
    );
    const role = roleRows[0];
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });
    if (role.code === ROLE_ADMIN) throw new ForbiddenException({ code: 'ADMIN_DROITS_IMPLICITES', message: "L'administrateur dispose toujours de tous les droits." });

    if (accorde && !role.peutVoirPortail) {
      throw new BadRequestException({
        code: 'PORTAIL_NON_ACTIVE',
        message: "L'accès au portail doit être activé pour ce rôle avant de pouvoir lui accorder l'accès à un service.",
      });
    }

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
    const { etab, tenantId } = await this.contexteAdmin(acteurUuid);

    const roleRows = await this.dataSource.query(
      `SELECT id, code FROM "identite"."role" WHERE uuid = $1`, [roleUuid],
    );
    const role = roleRows[0];
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });
    if (role.code === ROLE_ADMIN) throw new ForbiddenException({ code: 'ADMIN_PORTAIL_IMPLICITE', message: "L'administrateur voit toujours le portail." });
    if (role.code === 'super_admin') throw new ForbiddenException({ code: 'SUPER_ADMIN_NON_MODIFIABLE', message: 'Le super admin ne peut pas être modifié.' });

    await this.dataSource.query(
      `UPDATE "identite"."role" SET "peut_voir_portail" = $1 WHERE id = $2`,
      [peutVoirPortail, role.id],
    );

    // Si l'accès au portail est bloqué, tous les accès aux services restent bloqués pour ce rôle
    if (!peutVoirPortail) {
      await this.dataSource.query(
        `DELETE FROM "identite"."role_services_etablissement"
          WHERE role_id = $1
            AND etablissement_services_id IN (
              SELECT id FROM "identite"."etablissement_services" WHERE etablissement_id = $2
            )`,
        [role.id, etab.id],
      );
    }

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
