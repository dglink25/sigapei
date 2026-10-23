import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PermissionRole } from './permission-role.entity';
import { Role } from '../roles/role.entity';
import { Service } from '../services/service.entity';
import { versPermissionPublique } from './permission.mapper';
import { CreerPermissionDto } from './dto/creer-permission.dto';
import { ModifierPermissionDto } from './dto/modifier-permission.dto';
import { ListerPermissionsDto } from './dto/lister-permissions.dto';
import { RemplacerPermissionsRoleDto } from './dto/remplacer-permissions-role.dto';
import { ActeurRole } from '../roles/roles.service';
import { echapperLike, lirePagination, metaPagination } from '../common/dto/pagination.dto';
import { AccesCacheService } from '../acces-services/acces-cache.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionRole) private readonly repo: Repository<PermissionRole>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    private readonly cache: AccesCacheService,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  async lister(dto: ListerPermissionsDto, acteur: ActeurRole) {
    const { page, limite, offset } = lirePagination(dto);
    const qb = this.repo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.role', 'role')
      .innerJoinAndSelect('p.service', 'service');
    // Un administrateur ne voit que les roles globaux et ceux de son etablissement.
    if (acteur.roleCode !== 'super_admin') {
      qb.andWhere('(role.tenantId IS NULL OR role.tenantId = :tenantId)', { tenantId: acteur.tenantId });
    }
    if (dto.roleUuid) qb.andWhere('role.uuid = :roleUuid', { roleUuid: dto.roleUuid });
    if (dto.serviceUuid) qb.andWhere('service.uuid = :serviceUuid', { serviceUuid: dto.serviceUuid });
    if (dto.action) qb.andWhere('p.action = :action', { action: dto.action });
    if (dto.autorise !== undefined) qb.andWhere('p.autorise = :autorise', { autorise: dto.autorise });
    if (dto.q) {
      qb.andWhere(
        '(role.code ILIKE :q OR role.libelle ILIKE :q OR service.code ILIKE :q OR service.nom ILIKE :q OR p.action ILIKE :q)',
        { q: `%${echapperLike(dto.q)}%` },
      );
    }
    const [lignes, total] = await qb
      .orderBy('service.nom', 'ASC')
      .addOrderBy('role.code', 'ASC')
      .addOrderBy('p.action', 'ASC')
      .skip(offset)
      .take(limite)
      .getManyAndCount();
    return {
      permissions: lignes.map((l) => versPermissionPublique(l, l.role, l.service)),
      pagination: metaPagination(page, limite, total),
    };
  }

  async obtenir(uuid: string, acteur: ActeurRole) {
    const permission = await this.repo.findOne({ where: { uuid }, relations: { role: true, service: true } });
    if (!permission) throw this.introuvable();
    if (!this.roleLisible(permission.role, acteur)) throw this.introuvable();
    return { permission: versPermissionPublique(permission, permission.role, permission.service) };
  }

  /** Matrice complete d'un role (consommee par l'administration et par /interne/permissions-role). */
  async listerPourRole(roleUuid: string, acteur?: ActeurRole) {
    const role = acteur ? await this.roleLisibleOuEchouer(roleUuid, acteur) : await this.roleOuEchouer(roleUuid);
    const lignes = await this.repo.find({
      where: { roleId: role.id },
      relations: { service: true },
      order: { service: { nom: 'ASC' }, action: 'ASC' },
    });
    return {
      role: { uuid: role.uuid, code: role.code, libelle: role.libelle },
      permissions: lignes.map((l) => versPermissionPublique(l, undefined, l.service)),
    };
  }

  async creer(dto: CreerPermissionDto, acteur: ActeurRole) {
    const role = await this.roleDansPortee(dto.roleUuid, acteur);
    const service = await this.serviceOuEchouer(dto.serviceUuid);
    const existante = await this.repo.findOne({ where: { roleId: role.id, serviceId: service.id, action: dto.action } });
    if (existante) throw this.conflit();

    let enregistree: PermissionRole;
    try {
      enregistree = await this.repo.save(
        this.repo.create({
          roleId: role.id,
          serviceId: service.id,
          action: dto.action,
          autorise: dto.autorise ?? true,
        }),
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw this.conflit();
      throw err;
    }
    await this.cache.invaliderGlobal();
    this.rabbitmq.publier('permission.cree', {
      permissionUuid: enregistree.uuid,
      roleUuid: role.uuid,
      serviceUuid: service.uuid,
      action: enregistree.action,
    });
    return { permission: versPermissionPublique(enregistree, role, service) };
  }

  async modifier(uuid: string, dto: ModifierPermissionDto, acteur: ActeurRole) {
    const permission = await this.trouverOuEchouer(uuid);
    await this.roleDansPortee(permission.role.uuid, acteur);
    if (dto.action === undefined && dto.autorise === undefined) {
      throw new BadRequestException({ code: 'AUCUNE_MODIFICATION', message: 'Aucun champ a modifier.' });
    }
    if (dto.action !== undefined && dto.action !== permission.action) {
      const doublon = await this.repo.findOne({
        where: { roleId: permission.roleId, serviceId: permission.serviceId, action: dto.action },
      });
      if (doublon) throw this.conflit();
      permission.action = dto.action;
    }
    if (dto.autorise !== undefined) permission.autorise = dto.autorise;
    const enregistree = await this.repo.save(permission);
    await this.cache.invaliderGlobal();
    this.rabbitmq.publier('permission.modifiee', {
      permissionUuid: enregistree.uuid,
      roleUuid: permission.role.uuid,
      action: enregistree.action,
    });
    return { permission: versPermissionPublique(enregistree, permission.role, permission.service) };
  }

  async supprimer(uuid: string, acteur: ActeurRole) {
    const permission = await this.trouverOuEchouer(uuid);
    await this.roleDansPortee(permission.role.uuid, acteur);
    await this.repo.remove(permission);
    await this.cache.invaliderGlobal();
    this.rabbitmq.publier('permission.supprimee', {
      permissionUuid: uuid,
      roleUuid: permission.role.uuid,
      action: permission.action,
    });
    return { code: 'PERMISSION_SUPPRIMEE' };
  }

  /** Remplace la matrice d'un role en une transaction (les lignes absentes sont supprimees). */
  async remplacerPourRole(roleUuid: string, dto: RemplacerPermissionsRoleDto, acteur: ActeurRole) {
    const role = await this.roleDansPortee(roleUuid, acteur);
    const services = await this.serviceRepo.find({ where: { uuid: In(dto.permissions.map((p) => p.serviceUuid)) } });
    const parUuid = new Map(services.map((s) => [s.uuid, s]));
    const inconnus = dto.permissions.map((p) => p.serviceUuid).filter((u) => !parUuid.has(u));
    if (inconnus.length > 0) {
      throw new NotFoundException({
        code: 'SERVICE_INTROUVABLE',
        message: 'Un ou plusieurs services sont introuvables.',
        details: { services: [...new Set(inconnus)] },
      });
    }

    const cles = new Set<string>();
    for (const ligne of dto.permissions) {
      const cle = `${ligne.serviceUuid}:${ligne.action}`;
      if (cles.has(cle)) {
        throw new BadRequestException({
          code: 'PERMISSION_DUPLIQUEE',
          message: 'Le meme service et la meme action apparaissent plusieurs fois.',
          details: { serviceUuid: ligne.serviceUuid, action: ligne.action },
        });
      }
      cles.add(cle);
    }

    await this.repo.manager.transaction(async (manager) => {
      await manager.delete(PermissionRole, { roleId: role.id });
      await manager.save(
        PermissionRole,
        dto.permissions.map((ligne) =>
          manager.create(PermissionRole, {
            roleId: role.id,
            serviceId: parUuid.get(ligne.serviceUuid)!.id,
            action: ligne.action,
            autorise: ligne.autorise ?? true,
          }),
        ),
      );
    });

    await this.cache.invaliderGlobal();
    this.rabbitmq.publier('role.permissions.definies', {
      roleUuid: role.uuid,
      nombre: dto.permissions.length,
    });
    return this.listerPourRole(role.uuid);
  }

  private async trouverOuEchouer(uuid: string): Promise<PermissionRole> {
    const permission = await this.repo.findOne({ where: { uuid }, relations: { role: true, service: true } });
    if (!permission) throw this.introuvable();
    return permission;
  }

  private async roleOuEchouer(uuid: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { uuid } });
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Role introuvable.' });
    return role;
  }

  /** Un administrateur ne gere que les roles de son etablissement ; les roles globaux sont reserves au super_admin. */
  private async roleDansPortee(uuid: string, acteur: ActeurRole): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { uuid } });
    const estSuperAdmin = acteur.roleCode === 'super_admin';
    const dansPortee =
      role !== null &&
      (estSuperAdmin || (role.tenantId !== null && role.tenantId === acteur.tenantId));
    if (!role || !dansPortee) {
      throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Role introuvable.' });
    }
    return role;
  }

  /** Lecture : les roles globaux (systeme) restent consultables par un administrateur. */
  private roleLisible(role: Role, acteur: ActeurRole): boolean {
    return acteur.roleCode === 'super_admin' || role.tenantId === null || role.tenantId === acteur.tenantId;
  }

  private async roleLisibleOuEchouer(uuid: string, acteur: ActeurRole): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { uuid } });
    if (!role || !this.roleLisible(role, acteur)) {
      throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Role introuvable.' });
    }
    return role;
  }

  private async serviceOuEchouer(uuid: string): Promise<Service> {
    const service = await this.serviceRepo.findOne({ where: { uuid } });
    if (!service) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    return service;
  }

  private introuvable(): NotFoundException {
    return new NotFoundException({ code: 'PERMISSION_INTROUVABLE', message: 'Permission introuvable.' });
  }

  private conflit(): ConflictException {
    return new ConflictException({
      code: 'PERMISSION_DEJA_EXISTANTE',
      message: 'Cette action est deja definie pour ce role et ce service.',
    });
  }
}
