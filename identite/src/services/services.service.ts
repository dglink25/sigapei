import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service, StatutService } from './service.entity';
import { versServicePublic } from './service.mapper';
import { CreerServiceDto } from './dto/creer-service.dto';
import { ModifierServiceDto } from './dto/modifier-service.dto';
import { ListerServicesDto } from './dto/lister-services.dto';
import { echapperLike, lirePagination, metaPagination } from '../common/dto/pagination.dto';
import { AccesCacheService } from '../acces-services/acces-cache.service';
import { EtablissementService } from '../services-etablissements/etablissement-service.entity';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly repo: Repository<Service>,
    private readonly cache: AccesCacheService,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  async lister(dto: ListerServicesDto) {
    const { page, limite, offset } = lirePagination(dto);
    const qb = this.repo.createQueryBuilder('s');
    if (dto.status) qb.andWhere('s.status = :status', { status: dto.status });
    if (dto.q) qb.andWhere('(s.nom ILIKE :q OR s.code ILIKE :q)', { q: `%${echapperLike(dto.q)}%` });
    const [lignes, total] = await qb.orderBy('s.nom', 'ASC').skip(offset).take(limite).getManyAndCount();
    const [nb, compteurs] = await Promise.all([this.compterEtablissements(lignes.map((l) => l.id)), this.compteurs()]);
    return {
      services: lignes.map((l) => ({ ...versServicePublic(l), nbEtablissements: nb.get(l.id) ?? 0 })),
      pagination: metaPagination(page, limite, total),
      compteurs,
    };
  }

  async trouverOuEchouer(uuid: string): Promise<Service> {
    const service = await this.repo.findOne({ where: { uuid } });
    if (!service) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    return service;
  }

  async obtenir(uuid: string) {
    const service = await this.trouverOuEchouer(uuid);
    const nb = await this.compterEtablissements([service.id]);
    return { service: { ...versServicePublic(service), nbEtablissements: nb.get(service.id) ?? 0 } };
  }

  async creer(dto: CreerServiceDto) {
    if ((await this.repo.count({ where: { code: dto.code } })) > 0) throw this.conflitCode();
    let enregistre: Service;
    try {
      enregistre = await this.repo.save(
        this.repo.create({ code: dto.code, nom: dto.nom, description: dto.description ?? null, status: StatutService.ACTIVE }),
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw this.conflitCode();
      throw err;
    }
    this.rabbitmq.publier('service.cree', { serviceUuid: enregistre.uuid, code: enregistre.code });
    return { service: versServicePublic(enregistre) };
  }

  async modifier(uuid: string, dto: ModifierServiceDto) {
    const service = await this.trouverOuEchouer(uuid);
    if (dto.nom === undefined && dto.description === undefined && dto.status === undefined) {
      throw new BadRequestException({ code: 'AUCUNE_MODIFICATION', message: 'Aucun champ a modifier.' });
    }
    if (dto.nom !== undefined) service.nom = dto.nom;
    if (dto.description !== undefined) service.description = dto.description;
    if (dto.status !== undefined) service.status = dto.status;
    const enregistre = await this.repo.save(service);
    await this.cache.invaliderGlobal(); // le catalogue est lu par tous les calculs d'acces
    this.rabbitmq.publier('service.modifie', { serviceUuid: enregistre.uuid, status: enregistre.status });
    return { service: versServicePublic(enregistre) };
  }

  async supprimer(uuid: string) {
    const service = await this.trouverOuEchouer(uuid);
    const nbAssignations = await this.repo.manager.count(EtablissementService, { where: { serviceId: service.id } });
    if (nbAssignations > 0) {
      throw new ConflictException({
        code: 'SERVICE_ASSIGNE',
        message: `Ce service est encore assigne a ${nbAssignations} etablissement(s). Retirez les assignations ou desactivez-le.`,
        details: { etablissements: nbAssignations },
      });
    }
    await this.repo.remove(service);
    await this.cache.invaliderGlobal();
    this.rabbitmq.publier('service.supprime', { serviceUuid: uuid });
    return { code: 'SERVICE_SUPPRIME' };
  }

  /** Nombre d'etablissements auxquels chaque service est assigne. */
  private async compterEtablissements(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const lignes: Array<{ id: string; n: number }> = await this.repo.manager.query(
      `SELECT service_id::text AS id, COUNT(*)::int AS n FROM "identite"."etablissement_services"
        WHERE service_id = ANY($1::bigint[]) GROUP BY service_id`,
      [ids],
    );
    return new Map(lignes.map((l) => [l.id, l.n]));
  }

  /** Compteurs globaux du catalogue (onglets de l'interface), independants des filtres. */
  private async compteurs(): Promise<{ tous: number; active: number; inactive: number }> {
    const lignes: Array<{ status: string; n: number }> = await this.repo.manager.query(
      `SELECT status::text AS status, COUNT(*)::int AS n FROM "identite"."services" GROUP BY status`,
    );
    const active = lignes.find((l) => l.status === 'active')?.n ?? 0;
    const inactive = lignes.find((l) => l.status === 'inactive')?.n ?? 0;
    return { tous: active + inactive, active, inactive };
  }

  private conflitCode(): ConflictException {
    return new ConflictException({ code: 'SERVICE_CODE_EXISTANT', message: 'Un service avec ce code existe deja.' });
  }
}
