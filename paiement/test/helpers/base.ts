import { DataSource } from 'typeorm';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { Client } from 'pg';

export interface BaseTest {
  ds: DataSource;
  /** Connexion superutilisateur (hors RLS) pour préparer ou altérer des données de test. */
  admin: Client;
  port: number;
  nomBase: string;
  arreter: () => Promise<void>;
}

/** Crée une base vierge sur le PostgreSQL de la session de tests, applique TOUTES les migrations. */
export async function demarrerBase(): Promise<BaseTest> {
  const port = Number(process.env.PG_TEST_PORT);
  const nomBase = `t_${randomBytes(6).toString('hex')}`;
  const racine = new Client({ host: 'localhost', port, user: 'postgres', password: 'pw', database: 'postgres' });
  await racine.connect();
  await racine.query(`CREATE DATABASE "${nomBase}"`);
  await racine.end();
  const prep = new Client({ host: 'localhost', port, user: 'postgres', password: 'pw', database: nomBase });
  await prep.connect();
  await prep.query(`CREATE SCHEMA IF NOT EXISTS "paiement"`); // équivalent de scripts/creer-schema.js
  await prep.end();

  const ds = new DataSource({
    type: 'postgres', host: 'localhost', port, username: 'postgres', password: 'pw', database: nomBase,
    schema: 'paiement', synchronize: false, entities: [],
    migrations: [join(__dirname, '../../src/database/migrations/*.ts')],
    migrationsTableName: 'migrations_typeorm',
  });
  await ds.initialize();
  await ds.runMigrations();

  const admin = new Client({ host: 'localhost', port, user: 'postgres', password: 'pw', database: nomBase });
  await admin.connect();

  return {
    ds, admin, port, nomBase,
    arreter: async () => {
      await admin.end().catch(() => undefined);
      await ds.destroy().catch(() => undefined);
      const r = new Client({ host: 'localhost', port, user: 'postgres', password: 'pw', database: 'postgres' });
      await r.connect();
      await r.query(`DROP DATABASE IF EXISTS "${nomBase}" WITH (FORCE)`).catch(() => undefined);
      await r.end();
    },
  };
}
