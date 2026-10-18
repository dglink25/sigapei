import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EtablissementService } from './etablissement-service.entity';
import { versAssignationPublique } from './assignation.mapper';
import { Service, StatutService } from '../services/service.entity';
import { versServicePublic } from '../services/service.mapper';
import { UtilisateurServiceEtablissement } from '../acces-services/utilisateur-service-etablissement.entity';
import { AccesCacheService } from '../acces-services/acces-cache.service';
import { ecrireJournal } from '../acces-services/journal-acces.util';
import { EtablissementsRefService, EtablissementRef } from '../etablissements-ref/etablissements-ref.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { AssignerServicesDto } from './dto/assigner-services.dto';
import { AssignerEtablissementsDto } from './dto/assigner-etablissements.dto';
import { ChangerStatutLotDto } from './dto/changer-statut-lot.dto';
import { ListerJournalDto } from './dto/lister-journal.dto';
import { ModifierAssignationDto } from './dto/modifier-assignation.dto';
import { PaginationDto, lirePagination, metaPagination } from '../common/dto/pagination.dto';

export interface ActeurAdmin {
  utilisateurId: string;
}

@Injectable()
export class ServicesEtablissementsService {
  constructor(
    @InjectRepository(EtablissementService) private readonly repo: Repository<EtablissementService>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    private readonly ref: EtablissementsRefService,
    private readonly cache: AccesCacheService,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  /* ───────────────────────── Assignation (1 etablissement, N services) ───────────────────────── */

  /** Assigne 1 a 50 services a un etablissement (les assignations existantes sont ignorees). */
  async assigner(dto: AssignerServicesDto, acteur: ActeurAdmin) {
    const etab = await this.ref.trouverParUuidOuEchouer(dto.etablissementUuid);
    if (etab.statut === 'archive') {
      throw new ConflictException({ code: 'ETABLISSEMENT_ARCHIVE', message: 'Impossible : etablissement archive.' });
    }
    const uuids = [...new Set(dto.serviceUuids)];
    const services = await this.serviceRepo.find({ where: { uuid: In(uuids) } });

    const introuvables = uuids.filter((u) => !services.some((s) => s.uuid === u));
    if (introuvables.length > 0) {
      throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service(s) introuvable(s).', details: { introuvables } });
    }
    const inactifs = services.filter((s) => s.status !== StatutService.ACTIVE).map((s) => s.uuid);
    if (inactifs.length > 0) {
      throw new ConflictException({ code: 'SERVICE_INACTIF', message: 'Service(s) inactif(s) : assignation impossible.', details: { inactifs } });
    }

    const existants = await this.repo.find({ where: { etablissementId: etab.id, serviceId: In(services.map((s) => s.id)) } });
    const dejaIds = new Set(existants.map((e) => e.serviceId));
    const aCreer = services.filter((s) => !dejaIds.has(s.id));

    let crees: EtablissementService[] = [];
    if (aCreer.length > 0) {
      try {
        crees = await this.repo.manager.transaction(async (m) => {
          const lignes = await m.save(
            aCreer.map((s) => m.create(EtablissementService, { serviceId: s.id, etablissementId: etab.id, status: StatutService.ACTIVE, motif: null })),
          );
          await ecrireJournal(m, {
            tenantId: etab.uuid,
            acteurId: acteur.utilisateurId,
            cibleType: 'etablissement_service',
            cibleUuid: etab.uuid,
            action: 'etablissement_service.assigne',
            details: { services: aCreer.map((s) => s.uuid) },
          });
          return lignes;
        });
      } catch (err) {
        if ((err as { code?: string }).code === '23505') {
          throw new ConflictException({ code: 'SERVICE_DEJA_ASSIGNE', message: 'Un service est deja assigne a cet etablissement.' });
        }
        throw err;
      }
      await this.cache.invaliderTenant(etab.uuid);
      for (const s of aCreer) {
        this.rabbitmq.publier('etablissement_service.assigne', { tenantUuid: etab.uuid, serviceUuid: s.uuid });
      }
    }

    const parId = new Map(services.map((s) => [s.id, s]));
    return {
      etablissement: { uuid: etab.uuid, nom: etab.nom, statut: etab.statut },
      assignations: crees.map((c) => versAssignationPublique(c, parId.get(c.serviceId)!, undefined, 0)),
      dejaAssignes: services.filter((s) => dejaIds.has(s.id)).map((s) => s.uuid),
    };
  }

  /** B3 : assigne UN service a 1 a 200 etablissements, de maniere atomique. */
  async assignerEtablissements(serviceUuid: string, dto: AssignerEtablissementsDto, acteur: ActeurAdmin) {
    const service = await this.serviceRepo.findOne({ where: { uuid: serviceUuid } });
    if (!service) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    if (service.status !== StatutService.ACTIVE) {
      throw new ConflictException({ code: 'SERVICE_INACTIF', message: 'Service inactif : assignation impossible.' });
    }
    const uuids = [...new Set(dto.etablissementUuids)];
    const etabs = await this.ref.trouverParUuids(uuids);
    const introuvables = uuids.filter((u) => !etabs.some((e) => e.uuid === u));
    if (introuvables.length > 0) {
      throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Etablissement(s) introuvable(s).', details: { introuvables } });
    }
    const archives = etabs.filter((e) => e.statut === 'archive').map((e) => e.uuid);
    if (archives.length > 0) {
      throw new ConflictException({ code: 'ETABLISSEMENT_ARCHIVE', message: 'Etablissement(s) archive(s).', details: { archives } });
    }

    const existants = await this.repo.find({ where: { serviceId: service.id, etablissementId: In(etabs.map((e) => e.id)) } });
    const dejaIds = new Set(existants.map((e) => e.etablissementId));
    const aCreer = etabs.filter((e) => !dejaIds.has(e.id));

    let crees: EtablissementService[] = [];
    if (aCreer.length > 0) {
      try {
        crees = await this.repo.manager.transaction(async (m) => {
          const lignes = await m.save(
            aCreer.map((e) => m.create(EtablissementService, { serviceId: service.id, etablissementId: e.id, status: StatutService.ACTIVE, motif: null })),
          );
          for (const e of aCreer) {
            await ecrireJournal(m, {
              tenantId: e.uuid,
              acteurId: acteur.utilisateurId,
              cibleType: 'etablissement_service',
              cibleUuid: e.uuid,
              action: 'etablissement_service.assigne',
              details: { services: [service.uuid] },
            });
          }
          return lignes;
        });
      } catch (err) {
        if ((err as { code?: string }).code === '23505') {
          throw new ConflictException({ code: 'SERVICE_DEJA_ASSIGNE', message: 'Une assignation existe deja. Reessayez.' });
        }
        throw err;
      }
      for (const e of aCreer) {
        await this.cache.invaliderTenant(e.uuid);
        this.rabbitmq.publier('etablissement_service.assigne', { tenantUuid: e.uuid, serviceUuid: service.uuid });
      }
    }

    const parId = new Map(etabs.map((e) => [e.id, e]));
    return {
      service: versServicePublic(service),
      assignations: crees.map((c) => versAssignationPublique(c, service, parId.get(c.etablissementId), 0)),
      dejaAssignes: etabs.filter((e) => dejaIds.has(e.id)).map((e) => e.uuid),
    };
  }

  /* ───────────────────────── Lectures ───────────────────────── */

  async listerParEtablissement(etablissementUuid: string) {
    const etab = await this.ref.trouverParUuidOuEchouer(etablissementUuid);
    const lignes = await this.repo.find({ where: { etablissementId: etab.id }, relations: { service: true }, order: { createdAt: 'ASC' } });
    const nb = await this.compterAcces(lignes.map((l) => l.id));
    return {
      etablissement: { uuid: etab.uuid, nom: etab.nom, statut: etab.statut },
      assignations: lignes.map((l) => versAssignationPublique(l, l.service, undefined, nb.get(l.id) ?? 0)),
    };
  }

  async listerParService(serviceUuid: string, dto: PaginationDto) {
    const service = await this.serviceRepo.findOne({ where: { uuid: serviceUuid } });
    if (!service) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    const { page, limite, offset } = lirePagination(dto);
    const [lignes, total] = await this.repo.findAndCount({ where: { serviceId: service.id }, order: { createdAt: 'DESC' }, skip: offset, take: limite });
    const [etabs, nb] = await Promise.all([
      this.ref.trouverParIds([...new Set(lignes.map((l) => l.etablissementId))]),
      this.compterAcces(lignes.map((l) => l.id)),
    ]);
    const parId = new Map(etabs.map((e) => [e.id, e]));
    return {
      service: versServicePublic(service),
      assignations: lignes.map((l) => versAssignationPublique(l, service, parId.get(l.etablissementId), nb.get(l.id) ?? 0)),
      pagination: metaPagination(page, limite, total),
    };
  }

  async obtenir(uuid: string) {
    const es = await this.trouverOuEchouer(uuid);
    const [etab, nb] = await Promise.all([this.ref.trouverParId(es.etablissementId), this.compterAcces([es.id])]);
    return { assignation: versAssignationPublique(es, es.service, etab ?? undefined, nb.get(es.id) ?? 0) };
  }

  /** B2 : services actifs / bloques par etablissement (une seule requete, pour les tableaux de bord). */
  async resume() {
    const lignes: Array<{ id: string; actifs: number; bloques: number }> = await this.repo.manager.query(
      `SELECT es.etablissement_id::text AS id,
              COUNT(*) FILTER (WHERE es.status = 'active' AND s.status = 'active')::int AS actifs,
              COUNT(*) FILTER (WHERE NOT (es.status = 'active' AND s.status = 'active'))::int AS bloques
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        GROUP BY es.etablissement_id`,
    );
    const etabs = new Map((await this.ref.trouverParIds(lignes.map((l) => l.id))).map((e) => [e.id, e.uuid]));
    return {
      resume: lignes
        .filter((l) => etabs.has(l.id))
        .map((l) => ({ etablissementUuid: etabs.get(l.id)!, actifs: l.actifs, bloques: l.bloques })),
    };
  }

  /** B4 : journal des assignations et des changements de droits (lecture seule, pagine). */
  async journal(dto: ListerJournalDto) {
    const { page, limite, offset } = lirePagination(dto);
    const params: unknown[] = [];
    const conditions: string[] = ['TRUE'];
    if (dto.etablissementUuid) {
      params.push(dto.etablissementUuid);
      conditions.push(`a.tenant_id = $${params.length}::uuid`);
    }
    if (dto.serviceUuid) {
      params.push(dto.serviceUuid);
      const n = params.length;
      conditions.push(
        `(a.cible_uuid::text = $${n} OR a.details->>'serviceUuid' = $${n} OR COALESCE(a.details->'services', '[]'::jsonb) @> to_jsonb($${n}::text))`,
      );
    }
    const base = `FROM "identite"."audit_acces_service" a
      LEFT JOIN "identite"."utilisateur" u ON u.id = a.acteur_id
      LEFT JOIN "identite"."services" s
             ON s.uuid::text = COALESCE(a.details->>'serviceUuid', CASE WHEN a.cible_type = 'acces_service' THEN a.cible_uuid::text END)
      WHERE ${conditions.join(' AND ')}`;
    const manager = this.repo.manager;
    const [lignes, comptage]: [Array<Record<string, unknown>>, Array<{ total: number }>] = await Promise.all([
      manager.query(
        `SELECT a.action, a.cible_type AS "cibleType", a.tenant_id::text AS "tenantUuid", a.details,
                a.created_at AS "createdAt", u.nom_complet AS "acteurNom", s.nom AS "serviceNom"
           ${base} ORDER BY a.created_at DESC, a.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, offset],
      ),
      manager.query(`SELECT COUNT(*)::int AS total ${base}`, params),
    ]);
    const tenants = [...new Set(lignes.map((l) => l.tenantUuid as string | null).filter((t): t is string => !!t))];
    const etabs = new Map((await this.ref.trouverParUuids(tenants)).map((e) => [e.uuid, e.nom]));
    return {
      evenements: lignes.map((l) => ({
        action: l.action,
        cibleType: l.cibleType,
        acteur: l.acteurNom ? { nomComplet: l.acteurNom } : null,
        etablissement: l.tenantUuid ? { uuid: l.tenantUuid, nom: etabs.get(l.tenantUuid as string) ?? null } : null,
        serviceNom: l.serviceNom ?? null,
        details: l.details ?? null,
        createdAt: l.createdAt,
      })),
      pagination: metaPagination(page, limite, comptage[0].total),
    };
  }

  /* ───────────────────────── Modifications ───────────────────────── */

  async modifier(uuid: string, dto: ModifierAssignationDto, acteur: ActeurAdmin) {
    if (dto.status === undefined && dto.motif === undefined) {
      throw new BadRequestException({ code: 'AUCUNE_MODIFICATION', message: 'Aucun champ a modifier.' });
    }
    const es = await this.trouverOuEchouer(uuid);
    const statut = dto.status ?? es.status;
    return this.appliquer(es, statut, statut === StatutService.ACTIVE ? null : dto.motif ?? es.motif, acteur);
  }

  bloquer(uuid: string, motif: string | undefined, acteur: ActeurAdmin) {
    return this.changerStatut(uuid, StatutService.INACTIVE, motif ?? null, acteur);
  }

  reactiver(uuid: string, acteur: ActeurAdmin) {
    return this.changerStatut(uuid, StatutService.ACTIVE, null, acteur);
  }

  /** B3 : bloque ou reactive 1 a 200 assignations en une seule transaction. */
  async changerStatutLot(dto: ChangerStatutLotDto, acteur: ActeurAdmin) {
    const uuids = [...new Set(dto.assignationUuids)];
    const lignes = await this.repo.find({ where: { uuid: In(uuids) }, relations: { service: true } });
    const introuvables = uuids.filter((u) => !lignes.some((l) => l.uuid === u));
    if (introuvables.length > 0) {
      throw new NotFoundException({ code: 'ASSIGNATION_INTROUVABLE', message: 'Assignation(s) introuvable(s).', details: { introuvables } });
    }
    const etabs = new Map(
      (await this.ref.trouverParIds([...new Set(lignes.map((l) => l.etablissementId))])).map((e) => [e.id, e]),
    );
    const motif = dto.status === StatutService.ACTIVE ? null : dto.motif ?? null;
    await this.repo.manager.transaction(async (m) => {
      for (const l of lignes) {
        l.status = dto.status;
        l.motif = motif;
      }
      await m.save(lignes);
      for (const l of lignes) {
        await ecrireJournal(m, {
          tenantId: etabs.get(l.etablissementId)?.uuid ?? null,
          acteurId: acteur.utilisateurId,
          cibleType: 'etablissement_service',
          cibleUuid: l.uuid,
          action: dto.status === StatutService.ACTIVE ? 'etablissement_service.reactive' : 'etablissement_service.bloque',
          details: { serviceUuid: l.service.uuid, motif, lot: true },
        });
      }
    });
    for (const e of new Set(lignes.map((l) => etabs.get(l.etablissementId)?.uuid).filter((u): u is string => !!u))) {
      await this.cache.invaliderTenant(e);
    }
    for (const l of lignes) {
      this.rabbitmq.publier(dto.status === StatutService.ACTIVE ? 'etablissement_service.reactive' : 'etablissement_service.bloque', {
        tenantUuid: etabs.get(l.etablissementId)?.uuid ?? null,
        serviceUuid: l.service.uuid,
      });
    }
    return { code: dto.status === StatutService.ACTIVE ? 'SERVICES_REACTIVES' : 'SERVICES_BLOQUES', modifies: lignes.length };
  }

  /** Retire l'assignation : les droits des utilisateurs sur ce service sont supprimes en cascade (base de donnees). */
  async retirer(uuid: string, acteur: ActeurAdmin) {
    const es = await this.trouverOuEchouer(uuid);
    const etab = await this.ref.trouverParId(es.etablissementId);
    const droitsSupprimes = await this.repo.manager.transaction(async (m) => {
      const n = await m.count(UtilisateurServiceEtablissement, { where: { etablissementServicesId: es.id } });
      await m.remove(es);
      await ecrireJournal(m, {
        tenantId: etab?.uuid ?? null,
        acteurId: acteur.utilisateurId,
        cibleType: 'etablissement_service',
        cibleUuid: uuid,
        action: 'etablissement_service.retire',
        details: { serviceUuid: es.service.uuid, droitsSupprimes: n },
      });
      return n;
    });
    if (etab) await this.cache.invaliderTenant(etab.uuid);
    this.rabbitmq.publier('etablissement_service.retire', { tenantUuid: etab?.uuid ?? null, serviceUuid: es.service.uuid });
    return { code: 'SERVICE_RETIRE', droitsSupprimes };
  }

  /* ───────────────────────── Prive ───────────────────────── */

  private async changerStatut(uuid: string, statut: StatutService, motif: string | null, acteur: ActeurAdmin) {
    return this.appliquer(await this.trouverOuEchouer(uuid), statut, motif, acteur);
  }

  private async appliquer(es: EtablissementService, statut: StatutService, motif: string | null, acteur: ActeurAdmin) {
    const ancien = es.status;
    es.status = statut;
    es.motif = motif;
    const etab: EtablissementRef | null = await this.ref.trouverParId(es.etablissementId);
    const enregistre = await this.repo.manager.transaction(async (m) => {
      const sauve = await m.save(es);
      await ecrireJournal(m, {
        tenantId: etab?.uuid ?? null,
        acteurId: acteur.utilisateurId,
        cibleType: 'etablissement_service',
        cibleUuid: es.uuid,
        action: statut === StatutService.ACTIVE ? 'etablissement_service.reactive' : 'etablissement_service.bloque',
        details: { serviceUuid: es.service.uuid, ancienStatut: ancien, motif },
      });
      return sauve;
    });
    if (etab) await this.cache.invaliderTenant(etab.uuid);
    this.rabbitmq.publier(statut === StatutService.ACTIVE ? 'etablissement_service.reactive' : 'etablissement_service.bloque', {
      tenantUuid: etab?.uuid ?? null,
      serviceUuid: es.service.uuid,
    });
    const nb = await this.compterAcces([es.id]);
    return { assignation: versAssignationPublique(enregistre, es.service, etab ?? undefined, nb.get(es.id) ?? 0) };
  }

  /** Nombre d'utilisateurs ayant un acces explicite accorde, par assignation (B1). */
  private async compterAcces(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const lignes: Array<{ id: string; n: number }> = await this.repo.manager.query(
      `SELECT etablissement_services_id::text AS id, COUNT(*)::int AS n
         FROM "identite"."users_services_etablissement"
        WHERE autorised = true AND etablissement_services_id = ANY($1::bigint[])
        GROUP BY etablissement_services_id`,
      [ids],
    );
    return new Map(lignes.map((l) => [l.id, l.n]));
  }

  private async trouverOuEchouer(uuid: string): Promise<EtablissementService> {
    const es = await this.repo.findOne({ where: { uuid }, relations: { service: true } });
    if (!es) throw new NotFoundException({ code: 'ASSIGNATION_INTROUVABLE', message: 'Assignation introuvable.' });
    return es;
  }
}
