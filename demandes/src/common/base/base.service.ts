import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export type Executeur = Pick<EntityManager, 'query'>;

/**
 * Acces base : SQL parametre explicite (aucune concatenation de valeur), filtre tenant_id ecrit dans
 * chaque requete, transactions courtes. Le schema est toujours qualifie (demandes.*) : independant du search_path.
 */
@Injectable()
export class Base {
  constructor(readonly source: DataSource) {}

  async lignes<T = any>(sql: string, params: unknown[] = [], ex: Executeur = this.source): Promise<T[]> {
    return normaliser(await ex.query(sql, params));
  }

  async ligne<T = any>(sql: string, params: unknown[] = [], ex: Executeur = this.source): Promise<T | null> {
    return ((await this.lignes<T>(sql, params, ex))[0] as T) ?? null;
  }

  transaction<T>(travail: (ex: EntityManager) => Promise<T>): Promise<T> {
    return this.source.transaction(travail);
  }

  /** Reference lisible sans trou par etablissement et par annee : DA-2026-000042. */
  async reference(ex: Executeur, tenantId: number, nature: 'DA' | 'RC'): Promise<string> {
    const annee = new Date().getFullYear();
    const r = await ex.query(
      `INSERT INTO demandes.compteurs (tenant_id, nature, annee, valeur) VALUES ($1, $2, $3, 1)
       ON CONFLICT (tenant_id, nature, annee) DO UPDATE SET valeur = demandes.compteurs.valeur + 1
       RETURNING valeur`,
      [tenantId, nature, annee],
    );
    return `${nature}-${annee}-${String(r[0].valeur).padStart(6, '0')}`;
  }

  /** Journal d'audit en ajout seul (derogations, rejets, decisions, changements de permissions). */
  async journaliser(
    ex: Executeur,
    u: { uuid: string; tenantId: number; roleCode: string },
    action: string,
    cibleType: string,
    cibleUuid: string | null,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    await ex.query(
      `INSERT INTO demandes.journal_audit (tenant_id, action, cible_type, cible_uuid, auteur_uuid, auteur_role, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [u.tenantId, action, cibleType, cibleUuid, u.uuid, u.roleCode, JSON.stringify(details)],
    );
  }
}

/** Le pilote PostgreSQL de TypeORM renvoie [lignes, nombre] pour UPDATE/DELETE ... RETURNING : on rend toujours les lignes. */
function normaliser(r: any): any[] {
  if (Array.isArray(r) && r.length === 2 && Array.isArray(r[0]) && typeof r[1] === 'number') return r[0];
  return r;
}

/** Pagination commune : page >= 1, 1 <= par_page <= 100. */
export function pagination(page?: number, parPage?: number) {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const n = Math.min(100, Math.max(1, Math.floor(Number(parPage) || 20)));
  return { page: p, parPage: n, offset: (p - 1) * n };
}

export function page<T>(elements: T[], total: number, p: { page: number; parPage: number }) {
  return {
    elements,
    pagination: {
      page: p.page,
      par_page: p.parPage,
      total,
      pages: Math.max(1, Math.ceil(total / p.parPage)),
    },
  };
}
