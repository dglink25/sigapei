import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { isIP } from 'net';
import { DataSource, EntityManager } from 'typeorm';
import { ContexteAcces, avecContexte } from '../database/contexte';

export interface EvenementAudit {
  /** null / absent = événement de plateforme (visible du seul super administrateur). */
  etablissementUuid?: string | null;
  acteurUuid?: string | null;
  acteurRole?: string | null;
  action: string;
  objetType?: string;
  objetUuid?: string;
  avant?: unknown;
  apres?: unknown;
  resultat?: 'succes' | 'echec' | 'refus';
  motif?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
}

/** Qui consulte : détermine ce qu'il a le droit de voir. */
export interface PorteeAudit {
  role: 'super_admin' | 'administrateur' | 'utilisateur';
  etablissementUuid?: string | null;
  utilisateurUuid: string;
  roleBase?: string;
}

export interface FiltresAudit {
  etablissementUuid?: string; // super_admin seulement
  plateforme?: boolean; // super_admin seulement : événements sans établissement
  acteurUuid?: string; // ignoré pour un simple utilisateur (limité à lui-même)
  actionPrefixe?: string;
  objetType?: string;
  objetUuid?: string;
  correlationId?: string;
  resultat?: 'succes' | 'echec' | 'refus';
  du?: Date;
  au?: Date;
  page?: number;
  limite?: number;
}

const CLE_SENSIBLE = /(numero|telephone|phone|token|jeton|secret|password|passe|api_?key|cle|authorization|signature|otp|pin)/i;

/** Remplace récursivement les valeurs des champs sensibles : le journal ne doit jamais contenir de secret. */
export function masquerDonnees(valeur: unknown, profondeur = 0): unknown {
  if (valeur === null || valeur === undefined) return valeur;
  if (profondeur > 8) return '[trop profond]';
  if (Array.isArray(valeur)) return valeur.map((v) => masquerDonnees(v, profondeur + 1));
  if (typeof valeur === 'bigint') return valeur.toString();
  if (valeur instanceof Date) return valeur.toISOString();
  if (typeof valeur === 'object') {
    return Object.fromEntries(
      Object.entries(valeur as Record<string, unknown>).map(([k, v]) => [k, CLE_SENSIBLE.test(k) ? '***' : masquerDonnees(v, profondeur + 1)]),
    );
  }
  return valeur;
}

/**
 * Journal d'audit en AJOUT SEUL, chaîné par empreintes SHA-256 (flux par établissement + flux « plateforme »).
 * Le chaînage est calculé par la base (déclencheur) : aucun chemin de code ne peut l'oublier ou le falsifier
 * sans que la vérification ne le détecte.
 */
@Injectable()
export class AuditService {
  constructor(private readonly ds: DataSource) {}

  async enregistrer(e: EvenementAudit, manager?: EntityManager): Promise<void> {
    if (!e.action || e.action.length > 96) throw new BadRequestException({ code: 'AUDIT_INVALIDE', message: 'Action invalide.' });
    const m = manager ?? this.ds.manager;
    await m.query(
      `INSERT INTO "paiement"."audit_evenement"
         (etablissement_uuid, acteur_uuid, acteur_role, action, objet_type, objet_uuid, avant, apres, resultat, motif, ip, user_agent, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11::inet, $12, $13)`,
      [
        e.etablissementUuid ?? null, e.acteurUuid ?? null, e.acteurRole ?? null, e.action, e.objetType ?? null, e.objetUuid ?? null,
        e.avant === undefined ? null : JSON.stringify(masquerDonnees(e.avant)),
        e.apres === undefined ? null : JSON.stringify(masquerDonnees(e.apres)),
        e.resultat ?? 'succes', e.motif ?? null,
        e.ip && isIP(e.ip) ? e.ip : null,
        e.userAgent ? e.userAgent.slice(0, 512) : null, e.correlationId ?? null,
      ],
    );
  }

  /** Vérifie l'intégrité d'un flux : etablissement uuid ou 'plateforme'. */
  async verifierFlux(flux: string): Promise<{ intact: boolean; rangRompu?: number; motif?: string }> {
    const ctx: ContexteAcces = { role: 'systeme' };
    return avecContexte(this.ds, ctx, async (m) => {
      const r: Array<{ rang: string; motif: string }> = await m.query(
        `SELECT rang_rompu::text AS rang, motif FROM "paiement".audit_verifier($1)`, [flux],
      );
      return r.length === 0 ? { intact: true } : { intact: false, rangRompu: Number(r[0].rang), motif: r[0].motif };
    });
  }

  /**
   * Consultation avec cloisonnement :
   *  - super_admin : tout, filtrable par établissement ;
   *  - administrateur : uniquement son établissement ;
   *  - utilisateur : uniquement SES propres actions, dans son établissement.
   * Le même cloisonnement est appliqué par PostgreSQL (RLS) quand un rôle applicatif est utilisé.
   */
  async lister(f: FiltresAudit, portee: PorteeAudit) {
    const where: string[] = [];
    const params: unknown[] = [];
    const ajouter = (sql: string, v: unknown) => {
      params.push(v);
      where.push(sql.replace('?', `$${params.length}`));
    };

    if (portee.role === 'super_admin') {
      if (f.plateforme) where.push('etablissement_uuid IS NULL');
      else if (f.etablissementUuid) ajouter('etablissement_uuid = ?', f.etablissementUuid);
      if (f.acteurUuid) ajouter('acteur_uuid = ?', f.acteurUuid);
    } else {
      if (!portee.etablissementUuid) throw new ForbiddenException({ code: 'ACCES_REFUSE', message: "Aucun etablissement n'est rattache a votre compte." });
      ajouter('etablissement_uuid = ?', portee.etablissementUuid);
      if (portee.role === 'utilisateur') ajouter('acteur_uuid = ?', portee.utilisateurUuid);
      else if (f.acteurUuid) ajouter('acteur_uuid = ?', f.acteurUuid);
    }
    if (f.actionPrefixe) ajouter(`action LIKE ? ESCAPE '\\'`, `${f.actionPrefixe.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    if (f.objetType) ajouter('objet_type = ?', f.objetType);
    if (f.objetUuid) ajouter('objet_uuid = ?', f.objetUuid);
    if (f.correlationId) ajouter('correlation_id = ?', f.correlationId);
    if (f.resultat) ajouter('resultat = ?', f.resultat);
    if (f.du) ajouter('created_at >= ?', f.du);
    if (f.au) ajouter('created_at <= ?', f.au);

    const page = Math.max(1, f.page ?? 1);
    const limite = Math.min(100, Math.max(1, f.limite ?? 20));
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const estSuper = portee.role === 'super_admin';

    return avecContexte(this.ds, { role: portee.role, etablissementUuid: portee.etablissementUuid, roleBase: portee.roleBase }, async (m) => {
      const lignes: Array<Record<string, unknown>> = await m.query(
        `SELECT uuid, rang::text AS rang, etablissement_uuid, acteur_uuid, acteur_role, action, objet_type, objet_uuid,
                avant, apres, resultat, motif, correlation_id, created_at,
                ${estSuper ? 'hash, flux, host(ip) AS ip, user_agent' : 'NULL::text AS hash, NULL::text AS flux, NULL::text AS ip, NULL::text AS user_agent'}
           FROM "paiement"."audit_evenement" ${clause}
          ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limite, (page - 1) * limite],
      );
      const [{ total }] = await m.query(`SELECT COUNT(*)::int AS total FROM "paiement"."audit_evenement" ${clause}`, params);
      return {
        evenements: lignes.map((l) => (estSuper ? l : { ...l, hash: undefined, flux: undefined, ip: undefined, user_agent: undefined })),
        pagination: { page, limite, total: total as number, pages: Math.max(1, Math.ceil((total as number) / limite)) },
      };
    });
  }
}
