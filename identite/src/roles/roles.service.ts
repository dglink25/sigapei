import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilleAuth, Role, ROLES_SYSTEME } from './role.entity';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { versRolePublic } from './role.mapper';
import { CreerRoleDto } from './dto/creer-role.dto';
import { ModifierRoleDto } from './dto/modifier-role.dto';
import { ListerRolesDto } from './dto/lister-roles.dto';
import { echapperLike, lirePagination, metaPagination } from '../common/dto/pagination.dto';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

/** Acteur issu du JWT : le tenantId vient toujours de lui, jamais de la requete (sauf super_admin). */
export interface ActeurRole {
  roleCode: string;
  tenantId: string | null;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Utilisateur) private readonly utilisateurRepo: Repository<Utilisateur>,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  /**
   * Liste paginee des roles visibles : les roles systeme (tenantId nul) + ceux
   * de l'etablissement de l'acteur (ou d'un etablissement cible pour super_admin).
   */
  async lister(dto: ListerRolesDto, acteur: ActeurRole) {
    const { page, limite, offset } = lirePagination(dto);
    const tenantId = this.tenantCible(dto, acteur);
    const qb = this.queryPortee(tenantId);
    if (dto.familleAuth) qb.andWhere('role.familleAuth = :familleAuth', { familleAuth: dto.familleAuth });
    if (dto.q) qb.andWhere('(role.code ILIKE :q OR role.libelle ILIKE :q)', { q: `%${echapperLike(dto.q)}%` });
    const [lignes, total] = await qb
      .orderBy('role.estPersonnalise', 'ASC')
      .addOrderBy('role.libelle', 'ASC')
      .skip(offset)
      .take(limite)
      .getManyAndCount();
    const compteurs = await this.compteurs(tenantId);
    return {
      roles: lignes.map(versRolePublic),
      pagination: metaPagination(page, limite, total),
      compteurs,
    };
  }

  async obtenir(uuid: string, acteur: ActeurRole) {
    const role = await this.trouverDansPortee(uuid, acteur);
    return { role: versRolePublic(role) };
  }

  async creer(dto: CreerRoleDto, acteur: ActeurRole) {
    const estSuperAdmin = acteur.roleCode === 'super_admin';
    if (!estSuperAdmin) {
      if (!acteur.tenantId) {
        throw new ForbiddenException({ code: 'ACCES_REFUSE', message: "Aucun etablissement n'est rattache a votre compte." });
      }
      if (dto.tenantId && dto.tenantId !== acteur.tenantId) {
        throw new ForbiddenException({ code: 'TENANT_INTERDIT', message: 'Vous ne pouvez creer un role que pour votre etablissement.' });
      }
    }
    if ((ROLES_SYSTEME as readonly string[]).includes(dto.code)) {
      throw new ConflictException({ code: 'CODE_ROLE_RESERVE', message: 'Ce code correspond a un role systeme reserve.' });
    }
    if (dto.familleAuth === FamilleAuth.SUPER_ADMIN) {
      throw new ForbiddenException({
        code: 'FAMILLE_SUPER_ADMIN_INTERDITE',
        message: 'Aucun role personnalise ne peut etre rattache a la famille super_admin.',
      });
    }
    if ((await this.roleRepo.count({ where: { code: dto.code } })) > 0) throw this.conflitCode();

    let enregistre: Role;
    try {
      enregistre = await this.roleRepo.save(
        this.roleRepo.create({
          code: dto.code,
          libelle: dto.libelle,
          familleAuth: dto.familleAuth ?? FamilleAuth.PERSONNEL_ADMIN,
          estPersonnalise: true,
          tenantId: estSuperAdmin ? (dto.tenantId ?? null) : acteur.tenantId,
        }),
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw this.conflitCode();
      throw err;
    }
    this.rabbitmq.publier('role.cree', { roleUuid: enregistre.uuid, code: enregistre.code });
    return { role: versRolePublic(enregistre) };
  }

  async modifier(uuid: string, dto: ModifierRoleDto, acteur: ActeurRole) {
    const role = await this.trouverDansPortee(uuid, acteur);
    if (!role.estPersonnalise) {
      throw new ForbiddenException({ code: 'ROLE_SYSTEME_IMMUABLE', message: 'Un role systeme ne peut pas etre modifie.' });
    }
    if (dto.libelle === undefined && dto.familleAuth === undefined) {
      throw new BadRequestException({ code: 'AUCUNE_MODIFICATION', message: 'Aucun champ a modifier.' });
    }
    if (dto.familleAuth === FamilleAuth.SUPER_ADMIN) {
      throw new ForbiddenException({
        code: 'FAMILLE_SUPER_ADMIN_INTERDITE',
        message: 'Aucun role personnalise ne peut etre rattache a la famille super_admin.',
      });
    }
    if (dto.libelle !== undefined) role.libelle = dto.libelle;
    if (dto.familleAuth !== undefined) role.familleAuth = dto.familleAuth;
    const enregistre = await this.roleRepo.save(role);
    this.rabbitmq.publier('role.modifie', { roleUuid: enregistre.uuid });
    return { role: versRolePublic(enregistre) };
  }

  /** Supprime un role personnalise non utilise (sinon 400 : reaffecter les comptes d'abord). */
  async supprimer(uuid: string, acteur: ActeurRole): Promise<void> {
    const role = await this.trouverDansPortee(uuid, acteur);
    if (!role.estPersonnalise) {
      throw new ForbiddenException({ code: 'ROLE_SYSTEME_IMMUABLE', message: 'Un role systeme ne peut pas etre supprime.' });
    }
    const nbComptesActifs = await this.utilisateurRepo.count({ where: { roleId: role.id } });
    if (nbComptesActifs > 0) {
      throw new BadRequestException({
        code: 'ROLE_UTILISE',
        message: `Ce role est encore utilise par ${nbComptesActifs} compte(s) actif(s). Reaffectez-les avant suppression.`,
      });
    }
    await this.roleRepo.remove(role);
    this.rabbitmq.publier('role.supprime', { roleUuid: uuid });
  }

  /** Tous les roles (systeme + personnalises) pour un ciblage par code — usage interne (RPC RabbitMQ). */
  async tous(): Promise<Role[]> {
    return this.roleRepo.find({ order: { estPersonnalise: 'ASC', libelle: 'ASC' } });
  }

  /** Un non super_admin ne voit/modifie que les roles de son propre etablissement (sinon : introuvable). */
  private async trouverDansPortee(uuid: string, acteur: ActeurRole): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { uuid } });
    const dansPortee =
      role && (acteur.roleCode === 'super_admin' || (acteur.tenantId !== null && role.tenantId === acteur.tenantId));
    if (!role || !dansPortee) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Role introuvable.' });
    return role;
  }

  /** Le tenant visible : le super_admin peut cibler un etablissement, les autres le leur propre. */
  private tenantCible(dto: Pick<ListerRolesDto, 'tenantId'>, acteur: ActeurRole): string | undefined {
    if (acteur.roleCode === 'super_admin') return dto.tenantId ?? undefined;
    return acteur.tenantId ?? undefined;
  }

  /** Portee : roles systeme (tenantId nul) + roles personnalises du tenant cible. */
  private queryPortee(tenantId?: string) {
    const qb = this.roleRepo.createQueryBuilder('role');
    qb.where((sub) => {
      sub.where('role.tenantId IS NULL');
      if (tenantId) sub.orWhere('role.tenantId = :tenantId', { tenantId });
      else sub.orWhere('1=0');
    });
    return qb;
  }

  /** Compteurs de la portee (systeme / personnalises), independants des filtres de liste. */
  private async compteurs(tenantId?: string): Promise<{ tous: number; systeme: number; personnalises: number }> {
    const compter = (estPersonnalise: boolean) =>
      this.queryPortee(tenantId).andWhere('role.estPersonnalise = :estPersonnalise', { estPersonnalise }).getCount();
    const [systeme, personnalises] = await Promise.all([compter(false), compter(true)]);
    return { tous: systeme + personnalises, systeme, personnalises };
  }

  private conflitCode(): ConflictException {
    return new ConflictException({ code: 'ROLE_CODE_EXISTANT', message: 'Un role avec ce code existe deja.' });
  }
}
