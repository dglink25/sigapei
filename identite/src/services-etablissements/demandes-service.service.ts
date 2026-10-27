import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EtablissementsRefService } from '../etablissements-ref/etablissements-ref.service';
import { ServicesEtablissementsService } from './services-etablissements.service';
import { StatutService } from '../services/service.entity';

@Injectable()
export class DemandesServiceService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly etablissementsRef: EtablissementsRefService,
    private readonly servicesEtablissementsService: ServicesEtablissementsService,
  ) {}

  async onModuleInit() {
    // S'assure que la table existe même en dev sans migrations automatiques
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "identite"."demandes_service" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
        "etablissement_id" bigint NOT NULL,
        "service_id" bigint NOT NULL,
        "motif" text NOT NULL DEFAULT '',
        "statut" varchar(20) NOT NULL DEFAULT 'en_attente',
        "note_instruction" text NOT NULL DEFAULT '',
        "instruit_par" uuid NULL,
        "date_instruction" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_demandes_service_uuid" UNIQUE ("uuid"),
        CONSTRAINT "CHK_demandes_service_statut" CHECK (statut IN ('en_attente','acceptee','refusee')),
        CONSTRAINT "FK_demandes_service_etablissement" FOREIGN KEY ("etablissement_id")
          REFERENCES "etablissements"."etablissements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_demandes_service_service" FOREIGN KEY ("service_id")
          REFERENCES "identite"."services"("id") ON DELETE CASCADE
      )
    `).catch(() => {});

    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_demandes_service_etab_en_attente"
        ON "identite"."demandes_service" ("etablissement_id", "service_id")
        WHERE statut = 'en_attente'
    `).catch(() => {});
  }

  // ── Côté admin établissement ─────────────────────────────────────────

  async mesDemandes(tenantId: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });

    const rows = await this.dataSource.query(
      `SELECT d.uuid, d.motif, d.statut,
              d.note_instruction AS "noteInstruction",
              d.date_instruction AS "dateInstruction",
              d.created_at AS "createdAt",
              s.uuid AS "serviceUuid",
              s.nom AS "serviceNom",
              s.code AS "serviceCode",
              s.description AS "serviceDescription",
              s.status AS "serviceStatus"
         FROM "identite"."demandes_service" d
         JOIN "identite"."services" s ON s.id = d.service_id
        WHERE d.etablissement_id = $1
        ORDER BY d.created_at DESC`,
      [etab.id],
    );

    return rows.map((r: any) => ({
      uuid: r.uuid,
      motif: r.motif,
      statut: r.statut,
      noteInstruction: r.noteInstruction,
      dateInstruction: r.dateInstruction,
      createdAt: r.createdAt,
      service: {
        uuid: r.serviceUuid,
        nom: r.serviceNom,
        code: r.serviceCode,
        description: r.serviceDescription,
        status: r.serviceStatus,
      },
    }));
  }

  /**
   * Retourne les services du catalogue actifs que l'établissement n'a PAS encore
   * et pour lesquels il n'a pas déjà une demande en attente.
   */
  async servicesDisponibles(tenantId: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });

    return this.dataSource.query(
      `SELECT s.uuid, s.nom, s.code, s.description, s.status, s.created_at AS "createdAt"
         FROM "identite"."services" s
        WHERE s.status = 'active'
          AND s.id NOT IN (
            SELECT es.service_id
              FROM "identite"."etablissement_service" es
             WHERE es.etablissement_id = $1
          )
          AND s.id NOT IN (
            SELECT ds.service_id
              FROM "identite"."demandes_service" ds
             WHERE ds.etablissement_id = $1
               AND ds.statut = 'en_attente'
          )
        ORDER BY s.nom ASC`,
      [etab.id],
    );
  }

  async soumettre(tenantId: string, serviceUuid: string, motif: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });
    if (etab.statut !== 'actif') throw new ForbiddenException({ code: 'ETABLISSEMENT_INACTIF', message: 'Établissement non actif.' });

    const sRows = await this.dataSource.query(
      `SELECT id, uuid, nom, code, status FROM "identite"."services" WHERE uuid = $1`,
      [serviceUuid],
    );
    const service = sRows[0];
    if (!service) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    if (service.status !== StatutService.ACTIVE) {
      throw new ConflictException({ code: 'SERVICE_INACTIF', message: 'Ce service n\'est pas actif dans le catalogue.' });
    }

    // Vérifier si déjà assigné
    const assigneRows = await this.dataSource.query(
      `SELECT id FROM "identite"."etablissement_service" WHERE etablissement_id = $1 AND service_id = $2`,
      [etab.id, service.id],
    );
    if (assigneRows.length > 0) {
      throw new ConflictException({ code: 'SERVICE_DEJA_ASSIGNE', message: 'Ce service est déjà assigné à votre établissement.' });
    }

    // Vérifier si demande en attente
    const demRows = await this.dataSource.query(
      `SELECT id FROM "identite"."demandes_service" WHERE etablissement_id = $1 AND service_id = $2 AND statut = 'en_attente'`,
      [etab.id, service.id],
    );
    if (demRows.length > 0) {
      throw new ConflictException({ code: 'DEMANDE_DEJA_EN_COURS', message: 'Une demande pour ce service est déjà en attente d\'instruction.' });
    }

    const rows = await this.dataSource.query(
      `INSERT INTO "identite"."demandes_service" ("etablissement_id", "service_id", "motif", "statut")
       VALUES ($1, $2, $3, 'en_attente')
       RETURNING uuid, motif, statut, created_at AS "createdAt"`,
      [etab.id, service.id, (motif ?? '').trim()],
    );

    return {
      ...rows[0],
      service: {
        uuid: service.uuid,
        nom: service.nom,
        code: service.code,
      },
    };
  }

  async annuler(tenantId: string, demandeUuid: string) {
    const etab = await this.etablissementsRef.trouverParUuid(tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Établissement introuvable.' });

    const rows = await this.dataSource.query(
      `SELECT id, statut FROM "identite"."demandes_service" WHERE uuid = $1 AND etablissement_id = $2`,
      [demandeUuid, etab.id],
    );
    const demande = rows[0];
    if (!demande) throw new NotFoundException({ code: 'DEMANDE_INTROUVABLE', message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      throw new ConflictException({ code: 'DEMANDE_NON_ANNULABLE', message: 'Seule une demande en attente peut être annulée.' });
    }

    await this.dataSource.query(`DELETE FROM "identite"."demandes_service" WHERE id = $1`, [demande.id]);
    return { code: 'DEMANDE_ANNULEE', message: 'Demande de service annulée avec succès.' };
  }

  // ── Côté super admin ──────────────────────────────────────────────────

  async toutesLesDemandes(statut: string = 'en_attente') {
    const filtre = ['en_attente', 'acceptee', 'refusee', 'tous'].includes(statut) ? statut : 'en_attente';

    const rows = await this.dataSource.query(
      `SELECT d.uuid, d.motif, d.statut,
              d.note_instruction AS "noteInstruction",
              d.date_instruction AS "dateInstruction",
              d.created_at AS "createdAt",
              e.uuid AS "etablissementUuid",
              e.nom AS "etablissementNom",
              e.slug AS "etablissementSlug",
              s.uuid AS "serviceUuid",
              s.nom AS "serviceNom",
              s.code AS "serviceCode",
              s.description AS "serviceDescription"
         FROM "identite"."demandes_service" d
         JOIN "etablissements"."etablissements" e ON e.id = d.etablissement_id
         JOIN "identite"."services" s ON s.id = d.service_id
        ${filtre !== 'tous' ? `WHERE d.statut = '${filtre}'` : ''}
        ORDER BY d.created_at DESC`,
    );

    return rows.map((r: any) => ({
      uuid: r.uuid,
      motif: r.motif,
      statut: r.statut,
      noteInstruction: r.noteInstruction,
      dateInstruction: r.dateInstruction,
      createdAt: r.createdAt,
      etablissement: {
        uuid: r.etablissementUuid,
        nom: r.etablissementNom,
        slug: r.etablissementSlug,
      },
      service: {
        uuid: r.serviceUuid,
        nom: r.serviceNom,
        code: r.serviceCode,
        description: r.serviceDescription,
      },
    }));
  }

  async compteurs() {
    const rows = await this.dataSource.query(`
      SELECT statut, COUNT(*)::int AS count
        FROM "identite"."demandes_service"
       GROUP BY statut
    `);

    const stats = { enAttente: 0, acceptees: 0, refusees: 0, total: 0 };
    rows.forEach((r: any) => {
      if (r.statut === 'en_attente') stats.enAttente = r.count;
      if (r.statut === 'acceptee') stats.acceptees = r.count;
      if (r.statut === 'refusee') stats.refusees = r.count;
      stats.total += r.count;
    });
    return stats;
  }

  async accepter(demandeUuid: string, opts: { note?: string }, utilisateurId: string) {
    const rows = await this.dataSource.query(
      `SELECT d.id, d.statut, d.etablissement_id AS "etablissementId", d.service_id AS "serviceId",
              e.uuid AS "etablissementUuid", e.nom AS "etablissementNom",
              s.uuid AS "serviceUuid", s.nom AS "serviceNom"
         FROM "identite"."demandes_service" d
         JOIN "etablissements"."etablissements" e ON e.id = d.etablissement_id
         JOIN "identite"."services" s ON s.id = d.service_id
        WHERE d.uuid = $1`,
      [demandeUuid],
    );

    const demande = rows[0];
    if (!demande) throw new NotFoundException({ code: 'DEMANDE_INTROUVABLE', message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      throw new ConflictException({ code: 'DEMANDE_DEJA_INSTRUITE', message: 'Cette demande a déjà été instruite.' });
    }

    // 1. Assigner le service à l'établissement via le service d'assignation officiel
    await this.servicesEtablissementsService.assigner(
      {
        etablissementUuid: demande.etablissementUuid,
        serviceUuids: [demande.serviceUuid],
      },
      { utilisateurId },
    );

    // 2. Mettre à jour la demande en 'acceptee'
    await this.dataSource.query(
      `UPDATE "identite"."demandes_service"
          SET statut = 'acceptee',
              note_instruction = $1,
              instruit_par = $2,
              date_instruction = NOW(),
              updated_at = NOW()
        WHERE id = $3`,
      [opts?.note ?? '', utilisateurId, demande.id],
    );

    return {
      demandeUuid,
      statut: 'acceptee',
      etablissement: { uuid: demande.etablissementUuid, nom: demande.etablissementNom },
      service: { uuid: demande.serviceUuid, nom: demande.serviceNom },
      message: `Le service « ${demande.serviceNom} » a été activé pour l'établissement « ${demande.etablissementNom} ».`,
    };
  }

  async refuser(demandeUuid: string, note: string, utilisateurId: string) {
    if (!note || note.trim().length < 10) {
      throw new BadRequestException({ code: 'NOTE_INSUFFISANTE', message: 'Le motif du rejet doit comporter au moins 10 caractères.' });
    }

    const rows = await this.dataSource.query(
      `SELECT d.id, d.statut, s.nom AS "serviceNom", e.nom AS "etablissementNom"
         FROM "identite"."demandes_service" d
         JOIN "etablissements"."etablissements" e ON e.id = d.etablissement_id
         JOIN "identite"."services" s ON s.id = d.service_id
        WHERE d.uuid = $1`,
      [demandeUuid],
    );

    const demande = rows[0];
    if (!demande) throw new NotFoundException({ code: 'DEMANDE_INTROUVABLE', message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      throw new ConflictException({ code: 'DEMANDE_DEJA_INSTRUITE', message: 'Cette demande a déjà été instruite.' });
    }

    await this.dataSource.query(
      `UPDATE "identite"."demandes_service"
          SET statut = 'refusee',
              note_instruction = $1,
              instruit_par = $2,
              date_instruction = NOW(),
              updated_at = NOW()
        WHERE id = $3`,
      [note.trim(), utilisateurId, demande.id],
    );

    return {
      demandeUuid,
      statut: 'refusee',
      message: `La demande d'accès au service « ${demande.serviceNom} » a été rejetée.`,
    };
  }
}
