/**
 * GestionUtilisateursService — CRUD utilisateurs et assignation des rôles.
 *
 * Règles métier :
 *   - super_admin unique : aucun second super_admin ne peut être créé
 *   - tenantId obligatoire pour tout rôle ≠ super_admin
 *   - Un admin d'établissement ne peut gérer que les utilisateurs de son tenant
 *   - Un admin ne peut assigner que des rôles de son tenant (+ rôles globaux non super_admin)
 *   - Les rôles systèmes ne sont pas modifiables mais peuvent être assignés
 *   - La contrainte est aussi appliquée côté base via trigger (sécurité en profondeur)
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Utilisateur, StatutUtilisateur } from './utilisateur.entity';
import { Role, ROLES_SYSTEME } from '../roles/role.entity';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { normaliserTelephoneE164 } from '../common/utils/phone.util';
import { echapperLike, lirePagination, metaPagination } from '../common/dto/pagination.dto';
import { CreerUtilisateurDto } from './dto/creer-utilisateur.dto';
export interface ActeurGestion {
  roleCode: string;
  tenantId: string | null;
  utilisateurUuid: string;
}

@Injectable()
export class GestionUtilisateursService {
  constructor(
    @InjectRepository(Utilisateur) private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly dataSource: DataSource,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  // ── Liste des utilisateurs ────────────────────────────────────────────

  async lister(
    acteur: ActeurGestion,
    filtres: { q?: string; roleCode?: string; tenantId?: string; annee?: string; nomEtablissement?: string; page?: number | string; limite?: number | string },
  ) {
    const { page, limite, offset } = lirePagination({
      page:   filtres.page   ? Number(filtres.page)   : undefined,
      limite: filtres.limite ? Number(filtres.limite) : undefined,
    });

    const estSuperAdmin = acteur.roleCode === 'super_admin';
    const tenantId = estSuperAdmin ? (filtres.tenantId ?? null) : acteur.tenantId;

    if (!estSuperAdmin && !tenantId) {
      throw new ForbiddenException({ code: 'AUCUN_ETABLISSEMENT', message: "Aucun établissement rattaché à votre compte." });
    }

    const params: unknown[] = [];
    const conditions: string[] = [`ut.statut <> 'archive'`];

    if (tenantId) {
      params.push(tenantId);
      conditions.push(`ut."tenantId" = $${params.length}`);
    }

    if (filtres.q) {
      params.push(`%${echapperLike(filtres.q)}%`);
      const idx = params.length;
      conditions.push(`(ut.nom_complet ILIKE $${idx} OR ut.email ILIKE $${idx} OR ut.telephone ILIKE $${idx} OR ut.matricule ILIKE $${idx})`);
    }

    if (filtres.roleCode) {
      params.push(filtres.roleCode);
      conditions.push(`r.code = $${params.length}`);
    }

    if (filtres.annee) {
      params.push(filtres.annee);
      conditions.push(`EXTRACT(YEAR FROM ut.date_creation)::text = $${params.length}`);
    }

    if (filtres.nomEtablissement) {
      params.push(`%${echapperLike(filtres.nomEtablissement)}%`);
      conditions.push(`e.nom ILIKE $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Jointure LEFT avec etablissements pour récupérer le nom
    const base = `FROM "identite"."utilisateur" ut
      JOIN "identite"."role" r ON r.id = ut.role_id
      LEFT JOIN "etablissements"."etablissements" e ON e.uuid = ut."tenantId"::uuid
      ${where}`;

    const [utilisateurs, comptage] = await Promise.all([
      this.dataSource.query(
        `SELECT ut.uuid, ut.nom_complet AS "nomComplet", ut.email, ut.telephone, ut.matricule,
                ut.statut, r.code AS "roleCode", r.libelle AS "roleLibelle", r.uuid AS "roleUuid",
                ut."tenantId", ut.date_creation AS "dateCreation",
                e.nom AS "etablissementNom", e.slug AS "etablissementSlug"
           ${base}
           ORDER BY e.nom ASC NULLS LAST, ut.nom_complet ASC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, offset],
      ),
      this.dataSource.query(`SELECT COUNT(*)::int AS total ${base}`, params),
    ]);

    return { utilisateurs, pagination: metaPagination(page, limite, comptage[0].total) };
  }

  // ── Détail d'un utilisateur ────────────────────────────────────────────

  async obtenir(acteur: ActeurGestion, utilisateurUuid: string): Promise<Utilisateur> {
    const tenantId = this.resoudreTenant(acteur);
    const u = await this.utilisateurRepo.findOne({ where: { uuid: utilisateurUuid, tenantId } });
    if (!u) throw new NotFoundException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });
    return u;
  }

  // ── Création ────────────────────────────────────────────────────────────

  async creer(acteur: ActeurGestion, dto: CreerUtilisateurDto): Promise<Utilisateur> {
    const role = await this.roleRepo.findOne({ where: { uuid: dto.roleUuid } });
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });

    // Règle super_admin unique
    if (role.code === 'super_admin') {
      const dejaExiste = await this.utilisateurRepo.findOne({ where: { role } });
      if (dejaExiste) {
        throw new ConflictException({
          code: 'SUPER_ADMIN_UNIQUE',
          message: 'Il ne peut exister qu\'un seul super administrateur.',
        });
      }
    }

    // Résolution du tenant
    const tenantId = this.resoudreTenantPourCreation(acteur, dto, role);

    // Vérifier que le rôle est dans la portée de l'acteur
    this.verifierPorteeRole(acteur, role);

    // Normaliser le téléphone
    let telephoneE164: string | null = null;
    if (dto.telephone) {
      try {
        telephoneE164 = normaliserTelephoneE164(dto.telephone).e164;
      } catch {
        throw new BadRequestException({ code: 'TELEPHONE_INVALIDE', message: 'Numéro de téléphone invalide.' });
      }
    }

    // Vérifier unicité
    if (dto.email) {
      const existe = await this.utilisateurRepo.findOne({ where: { email: dto.email.toLowerCase() } });
      if (existe) throw new ConflictException({ code: 'EMAIL_DEJA_UTILISE', message: 'Cette adresse e-mail est déjà utilisée.' });
    }
    if (telephoneE164) {
      const existe = await this.utilisateurRepo.findOne({ where: { telephone: telephoneE164 } });
      if (existe) throw new ConflictException({ code: 'TELEPHONE_DEJA_UTILISE', message: 'Ce numéro est déjà utilisé.' });
    }

    const utilisateur = this.utilisateurRepo.create({
      tenantId,
      roleId: role.id,
      nomComplet: dto.nomComplet.trim(),
      email: dto.email?.toLowerCase() ?? null,
      telephone: telephoneE164,
      statut: StatutUtilisateur.ACTIF,
    });

    const enregistre = await this.utilisateurRepo.save(utilisateur);
    this.rabbitmq.publier('utilisateur.cree', {
      utilisateurUuid: enregistre.uuid,
      tenantId,
      roleCode: role.code,
    });
    return enregistre;
  }

  // ── Assignation de rôle ────────────────────────────────────────────────

  async assignerRole(acteur: ActeurGestion, utilisateurUuid: string, roleUuid: string): Promise<Utilisateur> {
    const tenantId = this.resoudreTenant(acteur);
    const cible = await this.utilisateurRepo.findOne({ where: { uuid: utilisateurUuid, tenantId } });
    if (!cible) throw new NotFoundException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });

    const role = await this.roleRepo.findOne({ where: { uuid: roleUuid } });
    if (!role) throw new NotFoundException({ code: 'ROLE_INTROUVABLE', message: 'Rôle introuvable.' });

    // On ne peut pas créer un second super_admin
    if (role.code === 'super_admin') {
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_NON_ASSIGNABLE',
        message: 'Le rôle super_admin ne peut pas être assigné via cette interface.',
      });
    }

    // Vérifier que le rôle est dans la portée de l'acteur
    this.verifierPorteeRole(acteur, role);

    // tenantId doit rester cohérent
    if (cible.tenantId !== tenantId) {
      throw new ForbiddenException({ code: 'TENANT_INCOHERENT', message: "Impossible d'assigner ce rôle hors de votre établissement." });
    }

    cible.roleId = role.id;
    const enregistre = await this.utilisateurRepo.save(cible);

    this.rabbitmq.publier('utilisateur.role_modifie', {
      utilisateurUuid: enregistre.uuid,
      tenantId: enregistre.tenantId,
      roleCode: role.code,
      acteurUuid: acteur.utilisateurUuid,
    });

    return enregistre;
  }

  // ── Bloquer / Archiver ─────────────────────────────────────────────────

  async modifierStatut(acteur: ActeurGestion, utilisateurUuid: string, statut: StatutUtilisateur): Promise<void> {
    const tenantId = this.resoudreTenant(acteur);
    const cible = await this.utilisateurRepo.findOne({ where: { uuid: utilisateurUuid, tenantId } });
    if (!cible) throw new NotFoundException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });

    // Ne pas bloquer/archiver son propre compte
    if (cible.uuid === acteur.utilisateurUuid) {
      throw new ForbiddenException({ code: 'AUTO_MODIFICATION_INTERDITE', message: 'Vous ne pouvez pas modifier votre propre statut.' });
    }

    // L'admin ne peut pas modifier un autre admin
    if (acteur.roleCode === 'administrateur' && cible.role.code === 'administrateur') {
      throw new ForbiddenException({ code: 'ADMIN_NON_MODIFIABLE', message: "Un administrateur ne peut pas modifier le statut d'un autre administrateur." });
    }

    cible.statut = statut;
    await this.utilisateurRepo.save(cible);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private resoudreTenant(acteur: ActeurGestion): string {
    if (acteur.roleCode === 'super_admin') {
      throw new BadRequestException({ code: 'TENANT_REQUIS', message: 'Le super admin doit spécifier un tenantId.' });
    }
    if (!acteur.tenantId) {
      throw new ForbiddenException({ code: 'AUCUN_ETABLISSEMENT', message: "Aucun établissement rattaché à votre compte." });
    }
    return acteur.tenantId;
  }

  private resoudreTenantPourCreation(acteur: ActeurGestion, dto: CreerUtilisateurDto, role: Role): string | null {
    if (role.code === 'super_admin') return null;

    if (acteur.roleCode === 'super_admin') {
      if (!dto.tenantId) {
        throw new BadRequestException({ code: 'TENANT_OBLIGATOIRE', message: 'tenantId requis pour ce rôle.' });
      }
      return dto.tenantId;
    }

    // Admin d'établissement : uniquement son propre tenant
    if (!acteur.tenantId) {
      throw new ForbiddenException({ code: 'AUCUN_ETABLISSEMENT', message: "Aucun établissement rattaché à votre compte." });
    }
    if (dto.tenantId && dto.tenantId !== acteur.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_INTERDIT', message: 'Vous ne pouvez créer des utilisateurs que pour votre établissement.' });
    }
    return acteur.tenantId;
  }

  private verifierPorteeRole(acteur: ActeurGestion, role: Role): void {
    if (acteur.roleCode === 'super_admin') return; // accès total

    // Admin : peut assigner uniquement des rôles globaux (tenantId null) ou de son propre tenant
    const estGlobal = role.tenantId === null;
    const estDuMêmeTenant = acteur.tenantId !== null && role.tenantId === acteur.tenantId;
    if (!estGlobal && !estDuMêmeTenant) {
      throw new ForbiddenException({
        code: 'ROLE_HORS_PORTEE',
        message: 'Ce rôle n\'appartient pas à votre établissement.',
      });
    }
  }
}
