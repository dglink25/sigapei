import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * DataSource TypeORM pour les commandes CLI (migration:run, migration:generate).
 * Pointe vers le schema "demandes" de la base unique partagee (CDC Regle n°1).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA ?? 'demandes',
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  logging: ['error'],
});
