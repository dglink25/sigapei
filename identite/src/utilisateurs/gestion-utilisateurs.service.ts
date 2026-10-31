/**
 * GestionUtilisateursService - CRUD utilisateurs et assignation des rôles.
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
  Logger,
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
import { EtablissementsRefService } from '../etablissements-ref/etablissements-ref.service';
import { UtilisateursService } from './utilisateurs.service';
import { SmsGatewayMaisonProvider } from '../integrations/sms/sms-gateway-maison.provider';
import { ConvessaProvider } from '../integrations/whatsapp/convessa.provider';
import { SmtpAppPasswordProvider } from '../integrations/email/smtp-app-password.provider';

export interface ActeurGestion {
  roleCode: string;
  tenantId: string | null;
  utilisateurUuid: string;
}

@Injectable()
export class GestionUtilisateursService {
  private readonly logger = new Logger(GestionUtilisateursService.name);

  constructor(
    @InjectRepository(Utilisateur) private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly dataSource: DataSource,
    private readonly rabbitmq: RabbitmqService,
    private readonly etablissementsRef: EtablissementsRefService,
    private readonly utilisateursService: UtilisateursService,
    private readonly smsProvider: SmsGatewayMaisonProvider,
    private readonly whatsappProvider: ConvessaProvider,
    private readonly emailProvider: SmtpAppPasswordProvider,
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

    // Résolution du code établissement pour le matricule
    const etab = tenantId ? await this.etablissementsRef.trouverParUuid(tenantId) : null;
    const codeEtab = etab?.code || (etab?.slug ? etab.slug.slice(0, 6).toUpperCase() : 'SIGA');
    const nomEtab = etab?.nom || 'SIGAPEI';
    const slugEtab = etab?.slug || '';

    // Génération automatique du matricule unique : XXX-code_de_son_etablissement-XXXXXXX
    const matricule = await this.utilisateursService.genererMatriculeUnique(codeEtab);

    const utilisateur = this.utilisateurRepo.create({
      tenantId,
      roleId: role.id,
      nomComplet: dto.nomComplet.trim(),
      email: dto.email?.toLowerCase() ?? null,
      telephone: telephoneE164,
      matricule,
      statut: StatutUtilisateur.ACTIF,
    });

    const enregistre = await this.utilisateurRepo.save(utilisateur);

    // Envoi automatique et immédiat des notifications SMS, WhatsApp et E-mail
    await this.envoyerNotificationsCreation({
      utilisateur: enregistre,
      matricule,
      roleLibelle: role.libelle,
      nomEtablissement: nomEtab,
      slugEtablissement: slugEtab,
    });

    this.rabbitmq.publier('utilisateur.cree', {
      utilisateurUuid: enregistre.uuid,
      tenantId,
      roleCode: role.code,
      matricule,
    });
    return enregistre;
  }

  /**
   * Envoi automatique multi-canal (SMS, WhatsApp et E-mail) des accès lors de la création d'un utilisateur.
   */
  private async envoyerNotificationsCreation(params: {
    utilisateur: Utilisateur;
    matricule: string;
    roleLibelle: string;
    nomEtablissement: string;
    slugEtablissement: string;
  }): Promise<void> {
    const { utilisateur, matricule, roleLibelle, nomEtablissement, slugEtablissement } = params;
    const nom = utilisateur.nomComplet;
    const tel = utilisateur.telephone;
    const email = utilisateur.email;
    const identifiant = email ?? tel ?? matricule;
    const urlPortail = slugEtablissement
      ? `https://${slugEtablissement}.sigapei.com/login`
      : 'https://sigapei.com/login';

    const promesses: Promise<any>[] = [];

    // 1. Envoi SMS automatique
    if (tel) {
      const msgSms = `SIGAPEI: Bonjour ${nom}, votre compte a été créé (${nomEtablissement}). Matricule: ${matricule}, Identifiant: ${identifiant}, Rôle: ${roleLibelle}. Accès: ${urlPortail}`;
      promesses.push(
        this.smsProvider.envoyerMessage(tel, msgSms).catch((err) => {
          this.logger.warn(`Échec SMS onboarding utilisateur vers ${tel}: ${err.message}`);
        }),
      );
    }

    // 2. Envoi WhatsApp automatique
    if (tel) {
      const msgWa =
        `*SIGAPEI - Création de compte*\n\n` +
        `Bonjour *${nom}*,\n\n` +
        `Votre compte utilisateur a été créé avec succès pour l'établissement *${nomEtablissement}*.\n\n` +
        `*Vos identifiants d'accès :*\n` +
        `• Matricule : *${matricule}*\n` +
        `• Identifiant de connexion : *${identifiant}*\n` +
        `• Rôle : ${roleLibelle}\n\n` +
        `*Accéder à votre espace :*\n${urlPortail}\n\n` +
        `SIGAPEI - Plateforme E-Académique`;

      promesses.push(
        this.whatsappProvider.envoyerMessage(tel, msgWa).catch((err) => {
          this.logger.warn(`Échec WhatsApp onboarding utilisateur vers ${tel}: ${err.message}`);
        }),
      );
    }

    // 3. Envoi E-mail automatique
    if (email) {
      promesses.push(
        this.emailProvider
          .envoyerNotificationOnboarding(email.toLowerCase(), {
            sujet: `Votre compte SIGAPEI est prêt - ${nomEtablissement}`,
            titreCourrier: 'Création de votre compte',
            corps: `
              <p style="margin:0 0 16px;color:#5a6b5f;font-size:14px">Bonjour <strong style="color:#1a2a1e">${nom}</strong>,</p>
              <p style="margin:0 0 24px;color:#1a2a1e;font-size:15px;line-height:1.6">
                Un compte d'accès vous a été créé pour l'établissement <strong>${nomEtablissement}</strong>.
              </p>
              <p style="margin:0 0 12px;color:#5a6b5f;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600">Vos identifiants d'accès</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dde4df;border-radius:8px;overflow:hidden;margin-bottom:24px">
                <tr style="background:#f7faf8">
                  <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;width:180px">Matricule personnel</td>
                  <td style="padding:10px 18px;color:#006B3C;font-size:14px;font-weight:700;font-family:monospace;letter-spacing:1px">${matricule}</td>
                </tr>
                <tr>
                  <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Identifiant de connexion</td>
                  <td style="padding:10px 18px;color:#1a2a1e;font-size:14px;font-weight:600;border-top:1px solid #dde4df">${identifiant}</td>
                </tr>
                <tr style="background:#f7faf8">
                  <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Rôle attribué</td>
                  <td style="padding:10px 18px;color:#1a2a1e;font-size:14px;font-weight:600;border-top:1px solid #dde4df">${roleLibelle}</td>
                </tr>
                <tr>
                  <td style="padding:10px 18px;color:#5a6b5f;font-size:14px;border-top:1px solid #dde4df">Établissement</td>
                  <td style="padding:10px 18px;color:#1a2a1e;font-size:14px;font-weight:600;border-top:1px solid #dde4df">${nomEtablissement}</td>
                </tr>
              </table>
              ${this.emailProvider.construireBoutonCta(urlPortail, 'Accéder à mon espace')}
            `,
          })
          .catch((err) => {
            this.logger.warn(`Échec e-mail onboarding utilisateur vers ${email}: ${err.message}`);
          }),
      );
    }

    await Promise.allSettled(promesses);
    this.logger.log(`Notifications onboarding (SMS, WhatsApp, Email) déclenchées pour ${utilisateur.uuid}`);
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
