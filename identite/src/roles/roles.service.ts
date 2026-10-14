import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilleAuth, Role, ROLES_SYSTEME } from './role.entity';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { CreerRoleDto } from './dto/creer-role.dto';
import { ModifierRoleDto } from './dto/modifier-role.dto';
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

  async lister(tenantId?: string): Promise<Role[]> {
    return this.roleRepo
      .createQueryBuilder('role')
      .where('role.tenantId IS NULL')
      .orWhere(tenantId ? 'role.tenantId = :tenantId' : '1=0', { tenantId })
      .orderBy('role.estPersonnalise', 'ASC')
      .getMany();
  }

  async creer(dto: CreerRoleDto, acteur: ActeurRole): Promise<Role> {
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
      throw new ConflictException({
        code: 'CODE_ROLE_RESERVE',
        message: 'Ce code correspond a un role systeme reserve.',
      });
    }
    if (dto.familleAuth === FamilleAuth.SUPER_ADMIN) {
      throw new ForbiddenException({
        code: 'FAMILLE_SUPER_ADMIN_INTERDITE',
        message: "Aucun role personnalise ne peut etre rattache a la famille super_admin.",
      });
    }
    const existant = await this.roleRepo.findOne({ where: { code: dto.code } });
    if (existant) {
      throw new ConflictException({ code: 'ROLE_DEJA_EXISTANT', message: 'Un role avec ce code existe deja.' });
    }

    const role = this.roleRepo.create({
      code: dto.code,
      libelle: dto.libelle,
      familleAuth: dto.familleAuth ?? FamilleAuth.PERSONNEL_ADMIN,
      estPersonnalise: true,
      tenantId: estSuperAdmin ? (dto.tenantId ?? null) : acteur.tenantId,
    });
    const enregistre = await this.roleRepo.save(role);
    this.rabbitmq.publier('role.cree', { roleUuid: enregistre.uuid, code: enregistre.code });
    return enregistre;
  }

  async modifier(uuid: string, dto: ModifierRoleDto, acteur: ActeurRole): Promise<Role> {
    const role = await this.trouverDansPortee(uuid, acteur);
    if (!role.estPersonnalise) {
      throw new ForbiddenException({
        code: 'ROLE_SYSTEME_IMMUABLE',
        message: 'Un role systeme ne peut pas etre modifie.',
      });
    }
    if (dto.familleAuth === FamilleAuth.SUPER_ADMIN) {
      throw new ForbiddenException({
        code: 'FAMILLE_SUPER_ADMIN_INTERDITE',
        message: "Aucun role personnalise ne peut etre rattache a la famille super_admin.",
      });
    }
    Object.assign(role, dto);
    const enregistre = await this.roleRepo.save(role);
    this.rabbitmq.publier('role.modifie', { roleUuid: enregistre.uuid });
    return enregistre;
  }

  async desactiver(uuid: string, acteur: ActeurRole): Promise<void> {
    const role = await this.trouverDansPortee(uuid, acteur);
    if (!role.estPersonnalise) {
      throw new ForbiddenException({
        code: 'ROLE_SYSTEME_IMMUABLE',
        message: 'Un role systeme ne peut pas etre supprime.',
      });
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

  /** Un non super_admin ne voit/modifie que les roles de son propre etablissement (sinon : introuvable). */
  private async trouverDansPortee(uuid: string, acteur: ActeurRole): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { uuid } });
    const dansPortee = role && (acteur.roleCode === 'super_admin' || (acteur.tenantId !== null && role.tenantId === acteur.tenantId));
    if (!role || !dansPortee) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Role introuvable.' });
    return role;
  }
}
