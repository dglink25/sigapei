/**
 * DemandesRoleService - Flux demande de rôle personnalisé.
 *
 * Côté admin établissement :
 *   - Soumettre une demande (nom souhaité + description obligatoire)
 *   - Annuler une demande en attente
 *   - Consulter ses demandes
 *
 * Côté super admin :
 *   - Lister toutes les demandes (filtrables par statut)
 *   - Accepter : crée le rôle + l'assigne à l'établissement demandeur + établissements optionnels
 *   - Refuser : clôt la demande avec note obligatoire
 *
 * Assignations (comme les services) :
 *   - Assigner un rôle à des établissements (multi-sélection visuelle)
 *   - Lister les établissements qui ont accès à un rôle
 *   - Retirer un rôle d'un établissement
 *   - Lister les rôles d'un établissement
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FamilleAuth, ROLES_SYSTEME } from './role.entity';
import { EtablissementsRefService } from '../etablissements-ref/etablissements-ref.service';

@Injectable()
export class DemandesRoleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly etablissementsRef: EtablissementsRefService,
  ) {}

  // ── Côté admin établissement ─────────────────────────────────────────

  async mesDemandes(tenantId: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });

    return this.dataSource.query(
      `SELECT d.uuid, d.nom_souhaite AS "nomSouhaite", d.description, d.statut,
              d.note_instruction AS "noteInstruction", d.role_cree_uuid AS "roleCreeUuid",
              d.date_instruction AS "dateInstruction", d.created_at AS "createdAt"
         FROM "identite"."demandes_role" d
        WHERE d.etablissement_id = $1
        ORDER BY d.created_at DESC`,
      [etab.id],
    );
  }

  async soumettre(tenantId: string, nomSouhaite: string, description: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });
    if (etab.statut !== 'actif') throw new ForbiddenException({ code: 'ETABLISSEMENT_INACTIF', message: 'Établissement non actif.' });

    // Unicité partielle (nom + etab + en_attente) garantie par index côté base
    const rows = await this.dataSource.query(
      `INSERT INTO "identite"."demandes_role" ("etablissement_id","nom_souhaite","description","statut")
       VALUES ($1,$2,$3,'en_attente') RETURNING uuid, nom_souhaite AS "nomSouhaite", statut, created_at AS "createdAt"`,
      [etab.id, nomSouhaite.trim(), description.trim()],
    );
    return rows[0];
  }

  async annuler(tenantId: string, demandeUuid: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });

    const rows = await this.dataSource.query(
      `SELECT id, statut FROM "identite"."demandes_role" WHERE uuid = $1 AND etablissement_id = $2`,
      [demandeUuid, etab.id],
    );
    const demande = rows[0];
    if (!demande) throw new NotFoundException({ code: 'DEMANDE_INTROUVABLE', message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') throw new ConflictException({ code: 'DEMANDE_NON_ANNULABLE', message: 'Seule une demande en attente peut être annulée.' });

    await this.dataSource.query(`DELETE FROM "identite"."demandes_role" WHERE id = $1`, [demande.id]);
    return { code: 'DEMANDE_ANNULEE' };
  }

  // ── Côté super admin ──────────────────────────────────────────────────

  async toutesLesDemandes(statut: string = 'en_attente') {
    const filtre = ['en_attente', 'acceptee', 'refusee', 'tous'].includes(statut) ? statut : 'en_attente';
    return this.dataSource.query(
      `SELECT d.uuid, d.nom_souhaite AS "nomSouhaite", d.description, d.statut,
              d.note_instruction AS "noteInstruction", d.role_cree_uuid AS "roleCreeUuid",
              d.date_instruction AS "dateInstruction", d.created_at AS "createdAt",
              e.uuid AS "etablissementUuid", e.nom AS "etablissementNom", e.slug AS "etablissementSlug"
         FROM "identite"."demandes_role" d
         JOIN "etablissements"."etablissements" e ON e.id = d.etablissement_id
        ${filtre !== 'tous' ? `WHERE d.statut = '${filtre}'` : ''}
        ORDER BY d.created_at DESC`,
    );
  }

  async accepter(
    demandeUuid: string,
    opts: { libelle: string; familleAuth?: string; etablissementIds: string[]; note?: string },
  ) {
    const rows = await this.dataSource.query(
      `SELECT d.id, d.statut, d.etablissement_id AS "etablissementId", d.nom_souhaite AS "nomSouhaite",
              e.uuid AS "etablissementUuid"
         FROM "identite"."demandes_role" d
         JOIN "etablissements"."etablissements" e ON e.id = d.etablissement_id
        WHERE d.uuid = $1`,
      [demandeUuid],
    );
    const demande = rows[0];
    if (!demande) throw new NotFoundException({ code: 'DEMANDE_INTROUVABLE', message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') throw new ConflictException({ code: 'DEMANDE_DEJA_INSTRUITE', message: 'Cette demande a déjà été instruite.' });

    const { libelle, familleAuth, etablissementIds, note = '' } = opts;

    if ((ROLES_SYSTEME as readonly string[]).includes(opts.libelle.toLowerCase().replace(/\s/g, '_'))) {
      throw new BadRequestException({ code: 'CODE_ROLE_RESERVE', message: 'Ce libellé correspond à un rôle système réservé.' });
    }

    // Générer un code unique
    const baseCode = libelle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);
    let code = baseCode;
    let suffix = 2;
    while (true) {
      const exists = await this.dataSource.query(`SELECT 1 FROM "identite"."role" WHERE code = $1`, [code]);
      if (exists.length === 0) break;
      code = `${baseCode}_${suffix++}`;
    }

    const result = await this.dataSource.transaction(async (m) => {
      // Créer le rôle
      const roleRows = await m.query(
        `INSERT INTO "identite"."role" ("code","libelle","familleAuth","estPersonnalise","tenantId")
         VALUES ($1,$2,$3::identite.identite_famille_auth_enum,true,NULL) RETURNING uuid, id`,
        [code, libelle, familleAuth ?? FamilleAuth.PERSONNEL_ADMIN],
      );
      const role = roleRows[0];

      // Consolider les établissements : inclure l'établissement demandeur + ceux sélectionnés
      const tousTenants = [...new Set([demande.etablissementUuid, ...etablissementIds])];
      const etabs = await this.etablissementsRef.trouverParUuids(tousTenants);

      for (const etab of etabs) {
        await m.query(
          `INSERT INTO "identite"."role_etablissements" ("role_id","etablissement_id")
           VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [role.id, etab.id],
        );
      }

      // Mettre à jour la demande
      await m.query(
        `UPDATE "identite"."demandes_role"
            SET statut='acceptee', note_instruction=$1, role_cree_uuid=$2, date_instruction=NOW(), updated_at=NOW()
          WHERE id=$3`,
        [note, role.uuid, demande.id],
      );

      return { roleUuid: role.uuid, code, libelle, assignes: etabs.length };
    });

    return result;
  }

  async refuser(demandeUuid: string, note: string) {
    const rows = await this.dataSource.query(
      `SELECT id, statut FROM "identite"."demandes_role" WHERE uuid = $1`,
      [demandeUuid],
    );
    const demande = rows[0];
    if (!demande) throw new NotFoundException({ code: 'DEMANDE_INTROUVABLE', message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') throw new ConflictException({ code: 'DEMANDE_DEJA_INSTRUITE', message: 'Cette demande a déjà été instruite.' });

    await this.dataSource.query(
      `UPDATE "identite"."demandes_role"
          SET statut='refusee', note_instruction=$1, date_instruction=NOW(), updated_at=NOW()
        WHERE id=$2`,
      [note, demande.id],
    );
    return { code: 'DEMANDE_REFUSEE' };
  }

  // ── Assignations rôle ↔ établissements ──────────────────────────────

  async listerEtablissementsParRole(roleUuid: string) {
    return this.dataSource.query(
      `SELECT re.uuid, e.uuid AS "etablissementUuid", e.nom AS "etablissementNom",
              e.slug AS "etablissementSlug", e.statut AS "etablissementStatut",
              re.created_at AS "createdAt"
         FROM "identite"."role_etablissements" re
         JOIN "etablissements"."etablissements" e ON e.id = re.etablissement_id
         JOIN "identite"."role" r ON r.id = re.role_id
        WHERE r.uuid = $1
        ORDER BY e.nom ASC`,
      [roleUuid],
    );
  }

  async listerRolesParEtablissement(etablissementUuid: string) {
    const etab = await this.etablissementsRef.trouverParUuid(etablissementUuid);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });

    return this.dataSource.query(
      `SELECT r.uuid, r.code, r.libelle, r."familleAuth", r."estPersonnalise",
              r.date_creation AS "dateCreation",
              COUNT(DISTINCT u.id)::int AS "nbUtilisateurs"
         FROM "identite"."role_etablissements" re
         JOIN "identite"."role" r ON r.id = re.role_id
         LEFT JOIN "identite"."utilisateur" u ON u.role_id = r.id AND u."tenantId" = $1
        WHERE re.etablissement_id = $2
        GROUP BY r.uuid, r.code, r.libelle, r."familleAuth", r."estPersonnalise", r.date_creation
        ORDER BY r."estPersonnalise" ASC, r.libelle ASC`,
      [etablissementUuid, etab.id],
    );
  }

  async assignerRoleAuxEtablissements(roleUuid: string, etablissementUuids: string[]) {
    const roleRows = await this.dataSource.query(
      `SELECT id FROM "identite"."role" WHERE uuid = $1`, [roleUuid],
    );
    if (!roleRows[0]) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });
    const roleId = roleRows[0].id;

    const etabs = await this.etablissementsRef.trouverParUuids(etablissementUuids);
    let assignes = 0;
    for (const etab of etabs) {
      const r = await this.dataSource.query(
        `INSERT INTO "identite"."role_etablissements" ("role_id","etablissement_id")
         VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id`,
        [roleId, etab.id],
      );
      if (r.length > 0) assignes++;
    }
    return { assignes, total: etabs.length };
  }

  async retirerRoleDEtablissement(assignationUuid: string) {
    const rows = await this.dataSource.query(
      `DELETE FROM "identite"."role_etablissements" WHERE uuid = $1 RETURNING id`,
      [assignationUuid],
    );
    if (!rows.length) throw new NotFoundException({ code: 'ASSIGNATION_INTROUVABLE', message: 'Assignation introuvable.' });
    return { code: 'ROLE_RETIRE' };
  }
}
