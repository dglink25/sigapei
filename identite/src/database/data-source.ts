import 'reflect-metadata';
import { setDefaultResultOrder } from 'dns';
import { setDefaultAutoSelectFamily } from 'net';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

import { Role } from '../roles/role.entity';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';
import { IdentifiantRecuperation } from '../utilisateurs/identifiant-recuperation.entity';
import { QuestionSecurite } from '../utilisateurs/question-securite.entity';
import { Appareil } from '../appareils/appareil.entity';
import { EmpreinteBiometrique } from '../biometrie/empreinte-biometrique.entity';
import { TentativeConnexion } from '../audit/tentative-connexion.entity';

// Desactive l'algorithme "Happy Eyeballs" (actif par defaut depuis Node 18/20) :
// celui-ci alterne les tentatives IPv6/IPv4 avec un timeout tres court par
// adresse (~250ms), ce qui echoue systematiquement sur un reseau a latence
// elevee ou avec des adresses IPv6 injoignables — alors qu'une connexion
// classique (comme celle de `psql`/`nc`) sur une seule adresse IPv4, avec le
// timeout TCP normal du systeme, aboutit sans probleme. On revient donc a ce
// comportement "classique" : une seule adresse (IPv4 en priorite), timeout OS.
setDefaultResultOrder('ipv4first');
setDefaultAutoSelectFamily(false);

dotenv.config();


export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA ?? 'identite',
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: { connectionTimeoutMillis: 20000 },
  entities: [Role, Utilisateur, IdentifiantRecuperation, QuestionSecurite, Appareil, EmpreinteBiometrique, TentativeConnexion],
  migrations: [__dirname + '/migrations/*.ts'],
  migrationsTableName: 'migrations_typeorm',
});