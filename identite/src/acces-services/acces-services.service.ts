import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { StatutUtilisateur, Utilisateur } from '../utilisateurs/utilisateur.entity';
import { EtablissementRef, EtablissementsRefService } from '../etablissements-ref/etablissements-ref.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { AccesCacheService } from './acces-cache.service';
import { ecrireJournal } from './journal-acces.util';
import { ListerUtilisateursServiceDto } from './dto/lister-utilisateurs-service.dto';
import { echapperLike, lirePagination, metaPagination } from '../common/dto/pagination.dto';

const ROLE_ADMIN = 'administrateur';

export interface ServiceAccessible {
  uuid: string;
  code: string;
  nom: string;
  description: string | null;
  origine: 'role_administrateur' | 'accord_explicite';
}
export interface AccesUtilisateur {
  services: ServiceAccessible[];
  motif?: string;
}
interface ContexteAdmin {
  acteur: Utilisateur;
  tenantId: string;
  etab: EtablissementRef;
}
interface LigneAssignation {
  id: string;
  statutAssignation: string;
  statutService: string;
  serviceUuid: string;
  code: string;
  nom: string;
}

@Injectable()
export class AccesServicesService {
  constructor(
    @InjectRepository(Utilisateur) private readonly utilisateurRepo: Repository<Utilisateur>,
    private readonly dataSource: DataSource,
    private readonly ref: EtablissementsRefService,
    private readonly cache: AccesCacheService,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  /* ───────────────────────── Cote utilisateur / interne (lecture, cachee) ───────────────────────── */

  /**
   * Services accessibles a un utilisateur. Le compte est relu en base a chaque appel (statut, role, tenant),
   * seul le calcul des services est mis en cache.
   * L'administrateur de l'etablissement a tous les services actifs de son organisation (droits implicites).
   */
  async servicesDeUtilisateur(utilisateurUuid: string): Promise<AccesUtilisateur> {
    const u = await this.utilisateurRepo.findOne({ where: { uuid: utilisateurUuid } });
    if (!u || u.statut !== StatutUtilisateur.ACTIF) return { services: [], motif: 'COMPTE_INACTIF' };
    if (!u.tenantId) return { services: [], motif: 'AUCUN_ETABLISSEMENT' };
    const tenantId = u.tenantId;
    const estAdmin = u.role.code === ROLE_ADMIN;
    return this.cache.obtenir<AccesUtilisateur>(tenantId, `${u.uuid}:${estAdmin ? 'a' : 'u'}`, () =>
      this.calculerServices(u.id, tenantId, estAdmin),
    );
  }

  private async calculerServices(utilisateurId: string, tenantId: string, estAdmin: boolean): Promise<AccesUtilisateur> {
    const etab = await this.ref.trouverParUuid(tenantId);
    if (!etab || etab.statut !== 'actif') return { services: [], motif: 'ETABLISSEMENT_INACTIF' };
    const lignes: Array<Omit<ServiceAccessible, 'origine'>> = await this.dataSource.query(
      `SELECT s.uuid, s.code, s.nom, s.description
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        WHERE es.etablissement_id = $1 AND es.status = 'active' AND s.status = 'active'
          AND ($2::boolean OR EXISTS (
                SELECT 1 FROM "identite"."users_services_etablissement" a
                 WHERE a.etablissement_services_id = es.id AND a.user_id = $3 AND a.autorised = true))
        ORDER BY s.nom`,
      [etab.id, estAdmin, utilisateurId],
    );
    const origine = estAdmin ? 'role_administrateur' : 'accord_explicite';
    return { services: lignes.map((l) => ({ ...l, origine })) };
  }

  /** Verification par code de service (utilisee par la passerelle et les autres microservices). */
  async verifierAcces(utilisateurUuid: string, serviceCode: string) {
    const r = await this.servicesDeUtilisateur(utilisateurUuid);
    const service = r.services.find((s) => s.code === serviceCode);
    if (service) return { autorise: true, origine: service.origine };
    return { autorise: false, motif: r.motif ?? 'SERVICE_NON_AUTORISE' };
  }

  /** Droits de l'utilisateur connecte sur un service (par uuid). */
  async accesSurService(utilisateurUuid: string, serviceUuid: string) {
    const r = await this.servicesDeUtilisateur(utilisateurUuid);
    const service = r.services.find((s) => s.uuid === serviceUuid);
    if (service) {
      return { serviceUuid, code: service.code, nom: service.nom, autorise: true, origine: service.origine };
    }
    const existe: unknown[] = await this.dataSource.query(`SELECT 1 FROM "identite"."services" WHERE uuid = $1`, [serviceUuid]);
    if (existe.length === 0) throw new NotFoundException({ code: 'SERVICE_INTROUVABLE', message: 'Service introuvable.' });
    return { serviceUuid, autorise: false, motif: r.motif ?? 'SERVICE_NON_AUTORISE' };
  }

  /* ───────────────────────── Cote administrateur de l'etablissement ───────────────────────── */

  /** Services assignes a mon etablissement (actifs ou bloques). */
  async listerServicesEtablissement(acteurUuid: string) {
    const { etab } = await this.contexteAdmin(acteurUuid);
    const services = await this.dataSource.query(
      `SELECT s.uuid, s.code, s.nom, s.description,
              es.status AS "statutAssignation", s.status AS "statutService", es.motif,
              (es.status = 'active' AND s.status = 'active') AS actif
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        WHERE es.etablissement_id = $1
        ORDER BY s.nom`,
      [etab.id],
    );
    return { etablissement: { uuid: etab.uuid, nom: etab.nom }, services };
  }

  /** Utilisateurs de mon etablissement avec leur droit sur un service (pagine, filtrable). */
  async listerUtilisateursDuService(acteurUuid: string, serviceUuid: string, dto: ListerUtilisateursServiceDto) {
    const { tenantId, etab } = await this.contexteAdmin(acteurUuid);
    const assignation = await this.resoudreAssignation(etab.id, serviceUuid);
    const { page, limite, offset } = lirePagination(dto);

    const params: unknown[] = [tenantId, assignation.id];
    const conditions = [`ut."tenantId" = $1`, `ut.statut <> 'archive'`];
    if (dto.q) {
      params.push(`%${echapperLike(dto.q)}%`);
      conditions.push(`(ut.nom_complet ILIKE $${params.length} OR ut.email ILIKE $${params.length})`);
    }
    if (dto.autorise !== undefined) {
      params.push(dto.autorise);
      conditions.push(`((r.code = '${ROLE_ADMIN}') OR COALESCE(a.autorised, false)) = $${params.length}`);
    }
    const base = `FROM "identite"."utilisateur" ut
      JOIN "identite"."role" r ON r.id = ut.role_id
      LEFT JOIN "identite"."users_services_etablissement" a ON a.user_id = ut.id AND a.etablissement_services_id = $2
      WHERE ${conditions.join(' AND ')}`;

    const [utilisateurs, comptage] = await Promise.all([
      this.dataSource.query(
        `SELECT ut.uuid, ut.nom_complet AS "nomComplet", ut.email, ut.telephone, ut.statut, r.code AS "roleCode",
                (r.code = '${ROLE_ADMIN}' OR COALESCE(a.autorised, false)) AS autorise,
                (r.code = '${ROLE_ADMIN}') AS implicite
           ${base} ORDER BY ut.nom_complet ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, offset],
      ),
      this.dataSource.query(`SELECT COUNT(*)::int AS total ${base}`, params),
    ]);
    return {
      service: { uuid: assignation.serviceUuid, code: assignation.code, nom: assignation.nom },
      utilisateurs,
      pagination: metaPagination(page, limite, comptage[0].total as number),
    };
  }

  /** Droits d'un utilisateur de mon etablissement sur chaque service assigne. */
  async droitsUtilisateur(acteurUuid: string, utilisateurUuid: string) {
    const { tenantId, etab } = await this.contexteAdmin(acteurUuid);
    const cible = await this.chargerCible(utilisateurUuid, tenantId);
    const implicite = cible.role.code === ROLE_ADMIN;
    const lignes: Array<{ uuid: string; code: string; nom: string; actif: boolean; autorise: boolean }> = await this.dataSource.query(
      `SELECT s.uuid, s.code, s.nom, (es.status = 'active' AND s.status = 'active') AS actif,
              COALESCE(a.autorised, false) AS autorise
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
         LEFT JOIN "identite"."users_services_etablissement" a ON a.etablissement_services_id = es.id AND a.user_id = $2
        WHERE es.etablissement_id = $1
        ORDER BY s.nom`,
      [etab.id, cible.id],
    );
    return {
      utilisateur: { uuid: cible.uuid, nomComplet: cible.nomComplet, roleCode: cible.role.code, statut: cible.statut },
      implicite,
      services: lignes.map((l) => ({
        ...l,
        autorise: implicite ? true : l.autorise,
        origine: implicite ? 'role_administrateur' : 'accord_explicite',
      })),
    };
  }

  /** Accorde ou revoque l'acces d'un utilisateur a un service. */
  async definirAcces(acteurUuid: string, utilisateurUuid: string, serviceUuid: string, autorise: boolean) {
    await this.definirAccesLot(acteurUuid, serviceUuid, [{ utilisateurUuid, autorise }]);
    return { code: autorise ? 'ACCES_ACCORDE' : 'ACCES_REVOQUE', utilisateurUuid, serviceUuid, autorise };
  }

  /** Accords en lot sur un service (1 a 200, une seule transaction : tout ou rien). */
  async definirAccesLot(acteurUuid: string, serviceUuid: string, accords: Array<{ utilisateurUuid: string; autorise: boolean }>) {
    const { acteur, tenantId, etab } = await this.contexteAdmin(acteurUuid);
    const assignation = await this.resoudreAssignation(etab.id, serviceUuid);

    const parUuid = new Map<string, boolean>(); // dernier accord gagne en cas de doublon
    for (const a of accords) parUuid.set(a.utilisateurUuid, a.autorise);
    const uuids = [...parUuid.keys()];

    // Le tenantId vient de la base : un utilisateur d'un autre etablissement est traite comme introuvable.
    const cibles = await this.utilisateurRepo.find({ where: { uuid: In(uuids), tenantId } });
    const introuvables = uuids.filter((u) => !cibles.some((c) => c.uuid === u));
    if (introuvables.length > 0) {
      throw new NotFoundException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur(s) introuvable(s) dans votre etablissement.', details: { introuvables } });
    }
    const admins = cibles.filter((c) => c.role.code === ROLE_ADMIN).map((c) => c.uuid);
    if (admins.length > 0) {
      throw new ConflictException({ code: 'ADMINISTRATEUR_DROITS_IMPLICITES', message: "Un administrateur dispose deja de tous les droits : non modifiable.", details: { utilisateurs: admins } });
    }
    const aAccorder = cibles.filter((c) => parUuid.get(c.uuid) === true);
    const archives = aAccorder.filter((c) => c.statut === StatutUtilisateur.ARCHIVE).map((c) => c.uuid);
    if (archives.length > 0) {
      throw new UnprocessableEntityException({ code: 'UTILISATEUR_ARCHIVE', message: "Impossible d'accorder un acces a un compte archive.", details: { utilisateurs: archives } });
    }
    if (aAccorder.length > 0 && (assignation.statutAssignation !== 'active' || assignation.statutService !== 'active')) {
      throw new ConflictException({ code: 'SERVICE_INACTIF', message: 'Ce service est bloque pour votre etablissement : acces non accordable.' });
    }

    const ids = cibles.map((c) => c.id);
    const flags = cibles.map((c) => parUuid.get(c.uuid) === true);
    await this.dataSource.transaction(async (m) => {
      await m.query(
        `INSERT INTO "identite"."users_services_etablissement" ("user_id","etablissement_services_id","autorised")
         SELECT t.uid, $2::bigint, t.aut FROM unnest($1::bigint[], $3::boolean[]) AS t(uid, aut)
         ON CONFLICT ("user_id","etablissement_services_id") DO UPDATE SET "autorised" = EXCLUDED."autorised"`,
        [ids, assignation.id, flags],
      );
      await ecrireJournal(m, {
        tenantId,
        acteurId: acteur.id,
        cibleType: 'acces_service',
        cibleUuid: serviceUuid,
        action: 'acces.modifie',
        details: {
          accordes: cibles.filter((c) => parUuid.get(c.uuid) === true).map((c) => c.uuid),
          revoques: cibles.filter((c) => parUuid.get(c.uuid) !== true).map((c) => c.uuid),
        },
      });
    });

    await this.cache.invaliderTenant(tenantId);
    for (const c of cibles) {
      this.rabbitmq.publier(parUuid.get(c.uuid) === true ? 'acces.accorde' : 'acces.revoque', {
        tenantUuid: tenantId,
        serviceUuid,
        utilisateurUuid: c.uuid,
      });
    }
    const nbAccordes = flags.filter(Boolean).length;
    return { code: 'ACCES_MIS_A_JOUR', serviceUuid, modifies: cibles.length, accordes: nbAccordes, revoques: cibles.length - nbAccordes };
  }

  /* ───────────────────────── Helpers prives ───────────────────────── */

  /** L'acteur est relu en base : role, statut et tenant du JWT (valide jusqu'a 15 min) ne font pas foi. */
  private async contexteAdmin(acteurUuid: string): Promise<ContexteAdmin> {
    const acteur = await this.utilisateurRepo.findOne({ where: { uuid: acteurUuid } });
    if (!acteur || acteur.statut !== StatutUtilisateur.ACTIF || acteur.role.code !== ROLE_ADMIN || !acteur.tenantId) {
      throw new ForbiddenException({ code: 'ACCES_REFUSE', message: "Action reservee a l'administrateur de l'etablissement." });
    }
    const etab = await this.ref.trouverParUuid(acteur.tenantId);
    if (!etab) throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Etablissement introuvable.' });
    if (etab.statut !== 'actif') {
      throw new ForbiddenException({ code: 'ETABLISSEMENT_INACTIF', message: "Votre etablissement n'est pas actif." });
    }
    return { acteur, tenantId: acteur.tenantId, etab };
  }

  private async chargerCible(utilisateurUuid: string, tenantId: string): Promise<Utilisateur> {
    const cible = await this.utilisateurRepo.findOne({ where: { uuid: utilisateurUuid, tenantId } });
    if (!cible) {
      throw new NotFoundException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable dans votre etablissement.' });
    }
    return cible;
  }

  private async resoudreAssignation(etablissementId: string, serviceUuid: string): Promise<LigneAssignation> {
    const lignes: LigneAssignation[] = await this.dataSource.query(
      `SELECT es.id::text AS id, es.status AS "statutAssignation", s.status AS "statutService",
              s.uuid AS "serviceUuid", s.code, s.nom
         FROM "identite"."etablissement_services" es
         JOIN "identite"."services" s ON s.id = es.service_id
        WHERE es.etablissement_id = $1 AND s.uuid = $2`,
      [etablissementId, serviceUuid],
    );
    if (lignes.length === 0) {
      throw new NotFoundException({ code: 'SERVICE_NON_ASSIGNE', message: "Ce service n'est pas assigne a votre etablissement." });
    }
    return lignes[0];
  }
}
