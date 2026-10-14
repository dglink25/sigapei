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
      assignations: crees.map((c) => versAssignationPublique(c, parId.get(c.serviceId)!)),
      dejaAssignes: services.filter((s) => dejaIds.has(s.id)).map((s) => s.uuid),
    };
  }

  async listerParEtablissement(etablissementUuid: string) {
    const etab = await this.ref.trouverParUuidOuEchouer(etablissementUuid);
    const lignes = await this.repo.find({ where: { etablissementId: etab.id }, relations: { service: true }, order: { createdAt: 'ASC' } });
    return {
      etablissement: { uuid: etab.uuid, nom: etab.nom, statut: etab.statut },
      assignations: lignes.map((l) => versAssignationPublique(l, l.service)),
    };
  }

  async listerParService(serviceUuid: string, dto: PaginationDto) {
    const service = await this.serviceRepo.findOne({ where: { uuid: serviceUuid } });
    if (!service) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    const { page, limite, offset } = lirePagination(dto);
    const [lignes, total] = await this.repo.findAndCount({ where: { serviceId: service.id }, order: { createdAt: 'DESC' }, skip: offset, take: limite });
    const etabs = new Map((await this.ref.trouverParIds([...new Set(lignes.map((l) => l.etablissementId))])).map((e) => [e.id, e]));
    return {
      service: versServicePublic(service),
      assignations: lignes.map((l) => versAssignationPublique(l, service, etabs.get(l.etablissementId))),
      pagination: metaPagination(page, limite, total),
    };
  }

  async obtenir(uuid: string) {
    const es = await this.trouverOuEchouer(uuid);
    const etab = await this.ref.trouverParId(es.etablissementId);
    return { assignation: versAssignationPublique(es, es.service, etab ?? undefined) };
  }

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
    return { assignation: versAssignationPublique(enregistre, es.service, etab ?? undefined) };
  }

  private async trouverOuEchouer(uuid: string): Promise<EtablissementService> {
    const es = await this.repo.findOne({ where: { uuid }, relations: { service: true } });
    if (!es) throw new NotFoundException({ code: 'ASSIGNATION_INTROUVABLE', message: 'Assignation introuvable.' });
    return es;
  }
}
