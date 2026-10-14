import { EntityManager } from 'typeorm';

export interface EntreeJournal {
  tenantId: string | null;
  acteurId: string | null;
  cibleType: string;
  cibleUuid: string | null;
  action: string;
  details?: Record<string, unknown>;
}

/** Ecrit une ligne dans identite.audit_acces_service, dans la transaction du manager fourni. */
export async function ecrireJournal(manager: EntityManager, e: EntreeJournal): Promise<void> {
  await manager.query(
    `INSERT INTO "identite"."audit_acces_service" ("tenant_id","acteur_id","cible_type","cible_uuid","action","details")
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [e.tenantId, e.acteurId, e.cibleType, e.cibleUuid, e.action, e.details ? JSON.stringify(e.details) : null],
  );
}
