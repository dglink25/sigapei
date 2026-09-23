import { MigrationInterface, QueryRunner } from 'typeorm';


export class CreationSchemaIdentite1758600000000 implements MigrationInterface {
  name = 'CreationSchemaIdentite1758600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "identite"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // --- Types enum ---
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_famille_auth_enum" AS ENUM ('parent_apprenant', 'personnel_admin', 'super_admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_statut_utilisateur_enum" AS ENUM ('actif', 'bloque', 'archive')
    `);
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_type_identifiant_enum" AS ENUM ('email', 'telephone')
    `);
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_statut_empreinte_enum" AS ENUM ('active', 'revoquee')
    `);
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_methode_connexion_enum" AS ENUM
        ('telephone_otp', 'email_otp', 'matricule_empreinte', 'google', 'github')
    `);
    await queryRunner.query(`
      CREATE TYPE "identite"."identite_statut_tentative_enum" AS ENUM ('succes', 'echec')
    `);

    // --- Table role ---
    await queryRunner.query(`
      CREATE TABLE "identite"."role" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(64) NOT NULL,
        "libelle" varchar(128) NOT NULL,
        "familleAuth" "identite"."identite_famille_auth_enum" NOT NULL DEFAULT 'personnel_admin',
        "estPersonnalise" boolean NOT NULL DEFAULT false,
        "tenantId" uuid NULL,
        "date_creation" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_role_code" UNIQUE ("code")
      )
    `);

    // --- Table utilisateur ---
    await queryRunner.query(`
      CREATE TABLE "identite"."utilisateur" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NULL,
        "role_id" bigint NOT NULL,
        "nom_complet" varchar(255) NOT NULL,
        "telephone" varchar(20) NULL,
        "email" varchar(255) NULL,
        "matricule" varchar(64) NULL,
        "pays_telephone" varchar(2) NULL,
        "statut" "identite"."identite_statut_utilisateur_enum" NOT NULL DEFAULT 'actif',
        "photo_url" varchar(512) NULL,
        "firebase_uid_google" varchar(128) NULL,
        "firebase_uid_github" varchar(128) NULL,
        "date_creation" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_utilisateur_uuid" UNIQUE ("uuid"),
        CONSTRAINT "FK_utilisateur_role" FOREIGN KEY ("role_id") REFERENCES "identite"."role"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_utilisateur_telephone" ON "identite"."utilisateur" ("telephone") WHERE "telephone" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_utilisateur_email" ON "identite"."utilisateur" ("email") WHERE "email" IS NOT NULL
    `);

    // --- Table identifiant_recuperation ---
    await queryRunner.query(`
      CREATE TABLE "identite"."identifiant_recuperation" (
        "id" BIGSERIAL PRIMARY KEY,
        "utilisateur_id" bigint NOT NULL,
        "type" "identite"."identite_type_identifiant_enum" NOT NULL,
        "valeur" varchar(255) NOT NULL,
        "verifie" boolean NOT NULL DEFAULT false,
        CONSTRAINT "FK_identifiant_recuperation_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE CASCADE
      )
    `);

    // --- Table question_securite ---
    await queryRunner.query(`
      CREATE TABLE "identite"."question_securite" (
        "id" BIGSERIAL PRIMARY KEY,
        "utilisateur_id" bigint NOT NULL,
        "question_id" varchar(64) NOT NULL,
        "reponse_hash" varchar(255) NOT NULL,
        CONSTRAINT "FK_question_securite_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE CASCADE
      )
    `);

    // --- Table appareil ---
    await queryRunner.query(`
      CREATE TABLE "identite"."appareil" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "utilisateur_id" bigint NOT NULL,
        "identifiant_local" varchar(255) NOT NULL,
        "nom_appareil" varchar(255) NULL,
        "type" varchar(64) NULL,
        "os" varchar(64) NULL,
        "fait_confiance" boolean NOT NULL DEFAULT false,
        "derniere_ip" varchar(64) NULL,
        "derniere_activite" TIMESTAMP NOT NULL DEFAULT now(),
        "date_creation" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_appareil_uuid" UNIQUE ("uuid"),
        CONSTRAINT "FK_appareil_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE CASCADE
      )
    `);

    // --- Table empreinte_biometrique ---
    await queryRunner.query(`
      CREATE TABLE "identite"."empreinte_biometrique" (
        "id" BIGSERIAL PRIMARY KEY,
        "utilisateur_id" bigint NOT NULL,
        "appareil_id" bigint NOT NULL,
        "credential_id" varchar(512) NOT NULL,
        "cle_publique" text NOT NULL,
        "compteur_signature" bigint NOT NULL DEFAULT 0,
        "statut" "identite"."identite_statut_empreinte_enum" NOT NULL DEFAULT 'active',
        "date_creation" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_empreinte_credential_id" UNIQUE ("credential_id"),
        CONSTRAINT "FK_empreinte_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_empreinte_appareil" FOREIGN KEY ("appareil_id")
          REFERENCES "identite"."appareil"("id") ON DELETE CASCADE
      )
    `);

    // --- Table tentative_connexion (journal d'audit) ---
    await queryRunner.query(`
      CREATE TABLE "identite"."tentative_connexion" (
        "id" BIGSERIAL PRIMARY KEY,
        "utilisateur_id" bigint NULL,
        "methode" "identite"."identite_methode_connexion_enum" NOT NULL,
        "statut" "identite"."identite_statut_tentative_enum" NOT NULL,
        "ip" varchar(64) NULL,
        "motif_echec" varchar(255) NULL,
        "cree_le" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_tentative_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "identite"."utilisateur"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."tentative_connexion"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."empreinte_biometrique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."appareil"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."question_securite"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."identifiant_recuperation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."utilisateur"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "identite"."role"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_statut_tentative_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_methode_connexion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_statut_empreinte_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_type_identifiant_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_statut_utilisateur_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "identite"."identite_famille_auth_enum"`);
    // Le schema et les extensions ne sont pas supprimes (potentiellement partages).
  }
}