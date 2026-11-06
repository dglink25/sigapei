import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { configurerApplication } from '../common/application';
import { HttpInterneService, Service } from '../common/http/http-interne.service';
import { DependanceIndisponible } from '../common/erreurs/erreurs';

export const SECRET = 'secret-de-test-interne-0123456789abcdef';

/** Base PostgreSQL reelle (contraintes et triggers testes pour de vrai), schema recree a chaque suite. */
export function configurerEnvironnement() {
  process.env.INTERNAL_API_SECRET = SECRET;
  process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
  process.env.DB_PORT = process.env.DB_PORT ?? '5432';
  process.env.DB_NAME = process.env.DB_NAME ?? 'sigapei_test';
  process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'postgres';
  process.env.DB_SSL = 'false';
  process.env.RABBITMQ_URL = '';
}

export interface Monde {
  jetons: Record<string, { sub: string; tenantId: string | null; roleCode: string }>;
  etablissements: Record<string, number>;
  apprenants: Record<string, any>;
  personnel: Record<string, any>;
  bulletins: Record<string, boolean>;
  impayes: Record<string, boolean>;
  sansAcces: Set<string>;
  enPanne: Set<Service>;
}

/** Faux microservices (Identite, Etablissements, Scolarite, RH, Evaluations, Finances) au niveau du client HTTP interne. */
export class FauxHttp {
  constructor(private readonly monde: Monde) {}

  async get(service: Service, chemin: string, params: any = {}, tenantId?: number): Promise<any> {
    if (this.monde.enPanne.has(service)) throw new DependanceIndisponible(`${service} en panne (test)`);
    if (service === 'identite' && chemin === '/v1/interne/introspection') {
      const c = this.monde.jetons[params.token];
      return c ? { success: true, valide: true, ...c } : { success: true, valide: false, motif: 'JETON_INVALIDE_OU_EXPIRE' };
    }
    if (service === 'identite' && chemin === '/v1/interne/acces') {
      return {
        success: true,
        autorise: !this.monde.sansAcces.has(params.utilisateurUuid),
      };
    }
    if (service === 'etablissements') {
      const id = this.monde.etablissements[params.uuid];
      return id ? { success: true, donnees: { id, uuid: params.uuid } } : null;
    }
    if (service === 'scolarite') {
      if (params.parent_uuid || params.utilisateur_uuid) {
        const liste = Object.values(this.monde.apprenants).filter(
          (x: any) =>
            x._tenant === tenantId &&
            (params.utilisateur_uuid
              ? x.utilisateur_uuid === params.utilisateur_uuid
              : (x.parents ?? []).some((p: any) => p.parent_uuid === params.parent_uuid)),
        );
        return { succes: true, donnees: liste };
      }
      const a = this.monde.apprenants[params.uuid];
      return { succes: true, donnees: a && a._tenant === tenantId ? a : null };
    }
    if (service === 'rh') {
      const uuid = chemin.split('/').pop()!;
      const p = this.monde.personnel[uuid];
      return p && p._tenant === tenantId ? { success: true, data: p } : null;
    }
    if (service === 'evaluations') {
      const uuid = chemin.split('/').pop()!;
      return {
        success: true,
        data: {
          apprenant_uuid: uuid,
          eligible: !!this.monde.bulletins[uuid],
          bulletins: [],
        },
      };
    }
    if (service === 'finances') {
      const uuid = chemin.split('/').pop()!;
      const impaye = !!this.monde.impayes[uuid];
      return {
        success: true,
        data: { apprenant_uuid: uuid, a_jour: !impaye, montant_echu_impaye: impaye ? 50000 : 0, en_retard_depuis: impaye ? '2026-10-01' : null },
      };
    }
    return null;
  }
}

export async function demarrer(monde: Monde): Promise<{ app: INestApplication; source: DataSource }> {
  configurerEnvironnement();
  const { Client } = require('pg');
  const c = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await c.connect();
  await c.query('DROP SCHEMA IF EXISTS demandes CASCADE');
  await c.query('CREATE SCHEMA demandes');
  await c.end();

  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HttpInterneService)
    .useValue(new FauxHttp(monde))
    .compile();
  const app = module.createNestApplication();
  configurerApplication(app);
  await app.init();
  const source = app.get(DataSource);
  await source.runMigrations();
  return { app, source };
}

export const nouveauMonde = (): Monde => ({
  jetons: {},
  etablissements: {},
  apprenants: {},
  personnel: {},
  bulletins: {},
  impayes: {},
  sansAcces: new Set(),
  enPanne: new Set(),
});

export const uuid = () => randomUUID();

/** Requete avec le jeton d'un utilisateur (voie front). */
export function en(app: INestApplication, jeton: string) {
  const agent = request(app.getHttpServer());
  const avec = (r: request.Test) => r.set('Authorization', `Bearer ${jeton}`);
  return {
    get: (url: string) => avec(agent.get(url)),
    post: (url: string, body?: object) => avec(agent.post(url)).send(body ?? {}),
    put: (url: string, body?: object) => avec(agent.put(url)).send(body ?? {}),
    patch: (url: string, body?: object) => avec(agent.patch(url)).send(body ?? {}),
  };
}
