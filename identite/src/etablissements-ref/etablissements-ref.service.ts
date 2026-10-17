import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface EtablissementRef {
  id: string;
  uuid: string;
  nom: string;
  slug: string;
  /** actif | suspendu | archive (schema "etablissements", gere par le microservice Etablissements). */
  statut: string;
}

/**
 * SEUL point d'acces d'Identite au schema "etablissements" (lecture seule).
 * Tout le reste du code manipule des uuid ; la conversion uuid -> id interne se fait ici.
 */
@Injectable()
export class EtablissementsRefService {
  constructor(private readonly dataSource: DataSource) {}

  async trouverParUuid(uuid: string): Promise<EtablissementRef | null> {
    const lignes: EtablissementRef[] = await this.dataSource.query(
      `SELECT id::text AS id, uuid::text AS uuid, nom, slug, statut FROM "etablissements"."etablissements" WHERE uuid = $1 LIMIT 1`,
      [uuid],
    );
    return lignes[0] ?? null;
  }

  async trouverParId(id: string): Promise<EtablissementRef | null> {
    const lignes: EtablissementRef[] = await this.dataSource.query(
      `SELECT id::text AS id, uuid::text AS uuid, nom, slug, statut FROM "etablissements"."etablissements" WHERE id = $1 LIMIT 1`,
      [id],
    );
    return lignes[0] ?? null;
  }

  async trouverParIds(ids: string[]): Promise<EtablissementRef[]> {
    if (ids.length === 0) return [];
    return this.dataSource.query(
      `SELECT id::text AS id, uuid::text AS uuid, nom, slug, statut FROM "etablissements"."etablissements" WHERE id = ANY($1::bigint[])`,
      [ids],
    );
  }

  async trouverParUuids(uuids: string[]): Promise<EtablissementRef[]> {
    if (uuids.length === 0) return [];
    return this.dataSource.query(
      `SELECT id::text AS id, uuid::text AS uuid, nom, slug, statut FROM "etablissements"."etablissements" WHERE uuid = ANY($1::uuid[])`,
      [uuids],
    );
  }

  async trouverParUuidOuEchouer(uuid: string): Promise<EtablissementRef> {
    const etab = await this.trouverParUuid(uuid);
    if (!etab) {
      throw new NotFoundException({ code: 'ETABLISSEMENT_INTROUVABLE', message: 'Etablissement introuvable.' });
    }
    return etab;
  }
}
