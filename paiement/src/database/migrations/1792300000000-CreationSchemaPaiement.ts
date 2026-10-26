import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schéma "paiement" - fondations (phase 0) :
 *  - référentiels : devises, agrégateurs, modes de paiement, paramètres de la plateforme
 *  - accès : accords par établissement, préférences, délégations du personnel (3 max)
 *  - argent : portefeuilles, comptes et GRAND LIVRE à double entrée (ajout seul), encaissements, décaissements
 *  - cycles de vie : états et transitions CONTRÔLÉS PAR LA BASE (en plus du code), historique automatique
 *  - preuves : reçus immuables à numérotation sans trou, journal d'audit chaîné par empreintes
 *  - sécurité : isolation par établissement (RLS), tables en ajout seul, interrupteurs d'urgence
 * Autonomie : aucune clé étrangère vers un autre schéma ; les établissements et utilisateurs sont des uuid.
 * Les statuts sont des varchar + CHECK (faciles à faire évoluer) ; les montants sont des entiers (unités mineures).
 */

/** Copie FIGÉE des machines à états au moment de cette migration (ne jamais importer le code vivant ici). */
const MACHINES: Record<string, { initiaux: string[]; transitions: Record<string, string[]> }> = {
  encaissement: {
    initiaux: ['initie'],
    transitions: {
      initie: ['en_attente', 'approuve', 'refuse', 'annule', 'expire'],
      en_attente: ['approuve', 'refuse', 'annule', 'expire'],
      refuse: ['approuve'],
      annule: ['approuve'],
      approuve: ['disponible', 'rembourse_partiel', 'rembourse'],
      disponible: ['rembourse_partiel', 'rembourse'],
      rembourse_partiel: ['rembourse'],
    },
  },
  decaissement: {
    initiaux: ['brouillon', 'approuve'],
    transitions: {
      brouillon: ['a_approuver', 'annule'],
      a_approuver: ['approuve', 'rejete', 'annule'],
      approuve: ['fonds_reserves', 'annule'],
      fonds_reserves: ['soumis', 'annule'],
      soumis: ['en_cours', 'envoye', 'echoue', 'incertain'],
      en_cours: ['envoye', 'echoue', 'incertain'],
      incertain: ['en_cours', 'envoye', 'echoue'],
    },
  },
  compte_reception: {
    initiaux: ['a_valider'],
    transitions: {
      a_valider: ['test_encaissement', 'archive'],
      test_encaissement: ['test_decaissement', 'echec'],
      test_decaissement: ['valide', 'echec'],
      echec: ['a_valider', 'archive'],
      valide: ['suspendu', 'archive'],
      suspendu: ['valide', 'archive'],
    },
  },
  remboursement: {
    initiaux: ['demande'],
    transitions: {
      demande: ['a_approuver', 'approuve', 'rejete'],
      a_approuver: ['approuve', 'rejete'],
      approuve: ['en_cours', 'effectue'],
      en_cours: ['effectue', 'echoue'],
      echoue: ['en_cours'],
    },
  },
  test_validation: {
    initiaux: ['en_cours'],
    transitions: { en_cours: ['reussi', 'echoue', 'expire'] },
  },
  accord_etablissement: {
    initiaux: ['demande', 'accorde'],
    transitions: {
      demande: ['accorde', 'refuse'],
      accorde: ['suspendu', 'revoque'],
      suspendu: ['accorde', 'revoque'],
      refuse: ['demande'],
      revoque: ['demande'],
    },
  },
};

const TABLES_AVEC_UPDATED_AT = [
  'agregateur', 'mode_paiement', 'parametre_plateforme', 'accord_etablissement', 'parametre_etablissement',
  'delegation_personnel', 'portefeuille', 'compte_reception', 'encaissement', 'lot_decaissement', 'decaissement',
  'remboursement', 'test_validation',
];
const TABLES_EN_AJOUT_SEUL = ['ecriture', 'ecriture_groupe', 'historique_statut', 'audit_evenement', 'appel_agregateur', 'recu'];
const TABLES_ISOLEES_PAR_ETABLISSEMENT = [
  'audit_evenement', 'encaissement', 'decaissement', 'lot_decaissement', 'portefeuille', 'compte_reception',
  'remboursement', 'recu', 'notification', 'accord_etablissement', 'parametre_etablissement', 'delegation_personnel',
  'acces_recu', 'test_validation', 'approbation',
];

export class CreationSchemaPaiement1792300000000 implements MigrationInterface {
  name = 'CreationSchemaPaiement1792300000000';

  public async up(q: QueryRunner): Promise<void> {
    const run = (sql: string) => q.query(sql);

    await run(`CREATE SCHEMA IF NOT EXISTS "paiement"`);

    /* ─────────────── Fonctions utilitaires ─────────────── */
    await run(`
      CREATE FUNCTION "paiement".interdire_modification() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Table en ajout seul : % interdit sur %.%', TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME USING ERRCODE = '42501';
      END $$`);
    await run(`
      CREATE FUNCTION "paiement".touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at := now(); RETURN NEW; END $$`);
    await run(`
      CREATE FUNCTION "paiement".acces_etablissement(p uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT COALESCE(current_setting('app.role', true), '') IN ('super_admin', 'systeme')
            OR (p IS NOT NULL AND p::text = COALESCE(current_setting('app.etablissement', true), ''))
      $$`);

    /* ─────────────── Référentiels ─────────────── */
    await run(`
      CREATE TABLE "paiement"."devise" (
        "code" varchar(3) PRIMARY KEY,
        "nom" varchar(64) NOT NULL,
        "exposant" smallint NOT NULL DEFAULT 0 CHECK ("exposant" BETWEEN 0 AND 3),
        "active" boolean NOT NULL DEFAULT true
      )`);
    await run(`
      CREATE TABLE "paiement"."agregateur" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "code" varchar(32) NOT NULL UNIQUE CHECK ("code" ~ '^[a-z0-9_]+$'),
        "nom" varchar(128) NOT NULL,
        "statut" varchar(16) NOT NULL DEFAULT 'inactif' CHECK ("statut" IN ('inactif','actif','suspendu')),
        "environnement" varchar(16) NOT NULL DEFAULT 'test' CHECK ("environnement" IN ('test','production')),
        "activation_par" uuid NULL,
        "activation_le" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`
      CREATE TABLE "paiement"."mode_paiement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "agregateur_id" bigint NOT NULL REFERENCES "paiement"."agregateur"("id"),
        "code" varchar(48) NOT NULL,
        "libelle" varchar(128) NOT NULL,
        "pays" varchar(2) NOT NULL,
        "operateur" varchar(48) NOT NULL,
        "type" varchar(16) NOT NULL CHECK ("type" IN ('mobile_money','carte','banque')),
        "sens" varchar(8) NOT NULL CHECK ("sens" IN ('entree','sortie')),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "montant_min" bigint NOT NULL CHECK ("montant_min" > 0),
        "montant_max" bigint NULL CHECK ("montant_max" IS NULL OR "montant_max" >= "montant_min"),
        "multiple" bigint NOT NULL DEFAULT 1 CHECK ("multiple" >= 1),
        "frais_taux" numeric(7,4) NOT NULL DEFAULT 0 CHECK ("frais_taux" BETWEEN 0 AND 100),
        "frais_fixe" bigint NOT NULL DEFAULT 0 CHECK ("frais_fixe" >= 0),
        "delai_reglement_heures" integer NOT NULL DEFAULT 0 CHECK ("delai_reglement_heures" >= 0),
        "redirection" boolean NOT NULL DEFAULT false,
        "statut" varchar(16) NOT NULL DEFAULT 'inactif' CHECK ("statut" IN ('inactif','actif')),
        "activation_par" uuid NULL,
        "activation_le" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("agregateur_id", "code", "sens", "pays", "devise")
      )`);
    await run(`
      CREATE TABLE "paiement"."parametre_plateforme" (
        "devise" varchar(3) PRIMARY KEY REFERENCES "paiement"."devise"("code"),
        "commission_avance_taux" numeric(7,4) NOT NULL DEFAULT 0 CHECK ("commission_avance_taux" BETWEEN 0 AND 100),
        "commission_avance_min" bigint NOT NULL DEFAULT 0 CHECK ("commission_avance_min" >= 0),
        "commission_avance_max" bigint NULL CHECK ("commission_avance_max" IS NULL OR "commission_avance_max" >= "commission_avance_min"),
        "plafond_avance_defaut" bigint NOT NULL DEFAULT 0 CHECK ("plafond_avance_defaut" >= 0),
        -- NULL = aucun seuil configure : TOUT remboursement requiert l'approbation du super administrateur
        "seuil_approbation_remboursement" bigint NULL CHECK ("seuil_approbation_remboursement" IS NULL OR "seuil_approbation_remboursement" >= 0),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);

    /* ─────────────── Accès des établissements ─────────────── */
    await run(`
      CREATE TABLE "paiement"."accord_etablissement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "mode_paiement_id" bigint NOT NULL REFERENCES "paiement"."mode_paiement"("id"),
        "statut" varchar(16) NOT NULL CHECK ("statut" IN ('demande','accorde','refuse','suspendu','revoque')),
        "demande_par" uuid NULL, "demande_le" timestamptz NULL,
        "decide_par" uuid NULL, "decide_le" timestamptz NULL,
        "motif" text NULL,
        "plafond_avance" bigint NULL CHECK ("plafond_avance" IS NULL OR "plafond_avance" >= 0),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("etablissement_uuid", "mode_paiement_id")
      )`);
    await run(`
      CREATE TABLE "paiement"."delegation_personnel" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "utilisateur_uuid" uuid NOT NULL,
        "peut_preparer" boolean NOT NULL DEFAULT false,
        "peut_approuver" boolean NOT NULL DEFAULT false,
        "actif" boolean NOT NULL DEFAULT true,
        "accorde_par" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("peut_preparer" OR "peut_approuver"),
        UNIQUE ("etablissement_uuid", "utilisateur_uuid")
      )`);
    // Trois personnes actives au plus par établissement (verrou consultatif contre les courses)
    await run(`
      CREATE FUNCTION "paiement".limiter_delegations() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE n integer;
      BEGIN
        IF NEW.actif THEN
          PERFORM pg_advisory_xact_lock(hashtextextended('delegation:' || NEW.etablissement_uuid::text, 0));
          SELECT COUNT(*) INTO n FROM "paiement"."delegation_personnel"
           WHERE etablissement_uuid = NEW.etablissement_uuid AND actif AND utilisateur_uuid <> NEW.utilisateur_uuid;
          IF n >= 3 THEN
            RAISE EXCEPTION 'Trois personnes au maximum peuvent etre designees pour les paiements du personnel' USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END $$`);
    await run(`CREATE TRIGGER trg_limiter_delegations BEFORE INSERT OR UPDATE ON "paiement"."delegation_personnel"
               FOR EACH ROW EXECUTE FUNCTION "paiement".limiter_delegations()`);

    /* ─────────────── Portefeuilles et grand livre ─────────────── */
    await run(`
      CREATE TABLE "paiement"."portefeuille" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "statut" varchar(16) NOT NULL DEFAULT 'actif' CHECK ("statut" IN ('actif','gele','ferme')),
        "plafond_avance" bigint NULL CHECK ("plafond_avance" IS NULL OR "plafond_avance" >= 0),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("etablissement_uuid", "devise")
      )`);
    await run(`
      CREATE TABLE "paiement"."compte" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "type" varchar(32) NOT NULL CHECK ("type" IN
          ('attente','disponible','reserve','avance_due','tresorerie','creance_agregateur','reserve_tests','commission_avance')),
        "nature" varchar(8) NOT NULL CHECK ("nature" IN ('actif','passif')),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "portefeuille_id" bigint NULL REFERENCES "paiement"."portefeuille"("id"),
        "agregateur_id" bigint NULL REFERENCES "paiement"."agregateur"("id"),
        "solde" bigint NOT NULL DEFAULT 0,
        "autorise_negatif" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("autorise_negatif" OR "solde" >= 0),
        CHECK (("portefeuille_id" IS NOT NULL) = ("type" IN ('attente','disponible','reserve','avance_due'))),
        CHECK (("agregateur_id" IS NOT NULL) = ("type" IN ('tresorerie','creance_agregateur','reserve_tests')))
      )`);
    await run(`CREATE UNIQUE INDEX uq_compte ON "paiement"."compte" ("type", "devise", COALESCE("portefeuille_id", 0), COALESCE("agregateur_id", 0))`);
    await run(`
      CREATE TABLE "paiement"."ecriture_groupe" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "type_operation" varchar(48) NOT NULL,
        "objet_type" varchar(32) NULL,
        "objet_uuid" uuid NULL,
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "cle_idempotence" varchar(128) NOT NULL UNIQUE,
        "empreinte_demande" char(64) NOT NULL,
        "description" text NULL,
        "cree_par" uuid NULL,
        "correlation_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`
      CREATE TABLE "paiement"."ecriture" (
        "id" BIGSERIAL PRIMARY KEY,
        "groupe_id" bigint NOT NULL REFERENCES "paiement"."ecriture_groupe"("id"),
        "compte_id" bigint NOT NULL REFERENCES "paiement"."compte"("id"),
        "sens" varchar(6) NOT NULL CHECK ("sens" IN ('debit','credit')),
        "montant" bigint NOT NULL CHECK ("montant" > 0),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`CREATE INDEX idx_ecriture_compte ON "paiement"."ecriture" ("compte_id", "id")`);
    await run(`CREATE INDEX idx_ecriture_groupe ON "paiement"."ecriture" ("groupe_id")`);
    await run(`CREATE INDEX idx_groupe_objet ON "paiement"."ecriture_groupe" ("objet_type", "objet_uuid")`);
    // Mise à jour du solde : UNIQUEMENT par ce déclencheur (actif : debit - credit ; passif : credit - debit)
    await run(`
      CREATE FUNCTION "paiement".appliquer_ecriture() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE c record; g record; delta bigint;
      BEGIN
        SELECT nature, devise INTO c FROM "paiement"."compte" WHERE id = NEW.compte_id FOR UPDATE;
        SELECT devise INTO g FROM "paiement"."ecriture_groupe" WHERE id = NEW.groupe_id;
        IF c.devise <> g.devise THEN
          RAISE EXCEPTION 'Devise du compte (%) differente de celle de l''operation (%)', c.devise, g.devise USING ERRCODE = '23514';
        END IF;
        delta := CASE WHEN (c.nature = 'actif' AND NEW.sens = 'debit') OR (c.nature = 'passif' AND NEW.sens = 'credit')
                      THEN NEW.montant ELSE -NEW.montant END;
        UPDATE "paiement"."compte" SET solde = solde + delta WHERE id = NEW.compte_id;
        RETURN NEW;
      END $$`);
    // IMPORTANT : le nom commence par une majuscule pour se déclencher AVANT les contrôles de clé étrangère (RI_*).
    // Ainsi le verrou exclusif sur le compte est pris avant le verrou partagé de la clé étrangère : pas d'interblocage
    // entre deux opérations concurrentes sur le même compte (test : « sans passer par le service »).
    await run(`CREATE TRIGGER "A1_appliquer_ecriture" AFTER INSERT ON "paiement"."ecriture"
               FOR EACH ROW EXECUTE FUNCTION "paiement".appliquer_ecriture()`);
    await run(`
      CREATE FUNCTION "paiement".proteger_solde() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.solde IS DISTINCT FROM OLD.solde AND pg_trigger_depth() < 2 THEN
          RAISE EXCEPTION 'Le solde d''un compte ne peut etre modifie que par une ecriture comptable' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END $$`);
    await run(`CREATE TRIGGER trg_proteger_solde BEFORE UPDATE ON "paiement"."compte"
               FOR EACH ROW EXECUTE FUNCTION "paiement".proteger_solde()`);
    // Équilibre débit = crédit, vérifié à la validation de la transaction
    await run(`
      CREATE FUNCTION "paiement".verifier_equilibre() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE d bigint; c bigint;
      BEGIN
        SELECT COALESCE(SUM(montant) FILTER (WHERE sens = 'debit'), 0), COALESCE(SUM(montant) FILTER (WHERE sens = 'credit'), 0)
          INTO d, c FROM "paiement"."ecriture" WHERE groupe_id = NEW.groupe_id;
        IF d <> c THEN
          RAISE EXCEPTION 'Ecritures desequilibrees (debit %, credit %)', d, c USING ERRCODE = '23514';
        END IF;
        RETURN NULL;
      END $$`);
    await run(`CREATE CONSTRAINT TRIGGER trg_equilibre AFTER INSERT ON "paiement"."ecriture"
               DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "paiement".verifier_equilibre()`);

    /* ─────────────── Comptes de réception, encaissements, décaissements ─────────────── */
    await run(`
      CREATE TABLE "paiement"."compte_reception" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "mode_paiement_id" bigint NOT NULL REFERENCES "paiement"."mode_paiement"("id"),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "type" varchar(16) NOT NULL DEFAULT 'mobile_money' CHECK ("type" IN ('mobile_money','banque')),
        "numero_chiffre" text NOT NULL,
        "numero_empreinte" char(64) NOT NULL,
        "numero_masque" varchar(32) NOT NULL,
        "cle_version" smallint NOT NULL,
        "nom_titulaire" varchar(255) NOT NULL,
        "statut" varchar(24) NOT NULL DEFAULT 'a_valider',
        "carence_jusqu_a" timestamptz NULL,
        "valide_le" timestamptz NULL,
        "cree_par" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`CREATE UNIQUE INDEX uq_compte_reception_actif ON "paiement"."compte_reception"
               ("etablissement_uuid", "mode_paiement_id", "numero_empreinte") WHERE "statut" <> 'archive'`);
    await run(`
      CREATE TABLE "paiement"."parametre_etablissement" (
        "etablissement_uuid" uuid NOT NULL,
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "reglement_mode" varchar(16) NOT NULL DEFAULT 'manuel' CHECK ("reglement_mode" IN ('manuel','immediat','quotidien','hebdomadaire')),
        "reglement_jour_semaine" smallint NULL CHECK ("reglement_jour_semaine" BETWEEN 1 AND 7),
        "reglement_heure" smallint NULL CHECK ("reglement_heure" BETWEEN 0 AND 23),
        "reglement_montant_min" bigint NOT NULL DEFAULT 0 CHECK ("reglement_montant_min" >= 0),
        "frais_entree_a_charge" varchar(16) NOT NULL DEFAULT 'etablissement' CHECK ("frais_entree_a_charge" IN ('etablissement','payeur')),
        "frais_sortie_a_charge" varchar(16) NOT NULL DEFAULT 'etablissement' CHECK ("frais_sortie_a_charge" IN ('etablissement','beneficiaire')),
        "source_fonds_sortie" varchar(24) NOT NULL DEFAULT 'fonds_disponibles' CHECK ("source_fonds_sortie" IN ('fonds_disponibles','avance_autorisee')),
        "encaissement_actif" boolean NOT NULL DEFAULT false,
        "decaissement_actif" boolean NOT NULL DEFAULT false,
        "compte_reception_defaut_id" bigint NULL REFERENCES "paiement"."compte_reception"("id"),
        "modifie_par" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("etablissement_uuid", "devise"),
        CHECK ("reglement_mode" <> 'hebdomadaire' OR "reglement_jour_semaine" IS NOT NULL)
      )`);
    await run(`
      CREATE TABLE "paiement"."encaissement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "portefeuille_id" bigint NOT NULL REFERENCES "paiement"."portefeuille"("id"),
        "agregateur_id" bigint NOT NULL REFERENCES "paiement"."agregateur"("id"),
        "mode_paiement_id" bigint NULL REFERENCES "paiement"."mode_paiement"("id"),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "montant" bigint NOT NULL CHECK ("montant" > 0),
        "frais_a_charge" varchar(16) NOT NULL CHECK ("frais_a_charge" IN ('etablissement','payeur')),
        "frais_agregateur" bigint NOT NULL DEFAULT 0 CHECK ("frais_agregateur" >= 0),
        "montant_paye" bigint NOT NULL CHECK ("montant_paye" >= "montant"),
        "montant_net" bigint NOT NULL CHECK ("montant_net" >= 0),
        "montant_rembourse" bigint NOT NULL DEFAULT 0 CHECK ("montant_rembourse" >= 0 AND "montant_rembourse" <= "montant_net"),
        "reference_marchande" varchar(64) NOT NULL,
        "reference_agregateur" varchar(128) NULL,
        "statut" varchar(24) NOT NULL DEFAULT 'initie',
        "statut_agregateur" varchar(48) NULL,
        "objet_type" varchar(32) NULL,
        "objet_uuid" uuid NULL,
        "libelle" varchar(255) NULL,
        "payeur_utilisateur_uuid" uuid NULL,
        "payeur_nom" varchar(255) NULL,
        "payeur_telephone_chiffre" text NULL,
        "payeur_telephone_masque" varchar(32) NULL,
        "payeur_telephone_empreinte" char(64) NULL,
        "payeur_email" varchar(255) NULL,
        "cle_idempotence" varchar(128) NOT NULL,
        "url_paiement" text NULL,
        "expire_le" timestamptz NULL,
        "approuve_le" timestamptz NULL,
        "disponible_le" timestamptz NULL,
        "metadonnees" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "version" bigint NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("montant_net" = "montant_paye" - "frais_agregateur"),
        UNIQUE ("agregateur_id", "reference_marchande"),
        UNIQUE ("etablissement_uuid", "cle_idempotence")
      )`);
    await run(`CREATE UNIQUE INDEX uq_encaissement_ref_agregateur ON "paiement"."encaissement" ("agregateur_id", "reference_agregateur") WHERE "reference_agregateur" IS NOT NULL`);
    await run(`CREATE INDEX idx_encaissement_etab ON "paiement"."encaissement" ("etablissement_uuid", "created_at" DESC)`);
    await run(`CREATE INDEX idx_encaissement_reglement ON "paiement"."encaissement" ("disponible_le") WHERE "statut" = 'approuve'`);
    await run(`CREATE INDEX idx_encaissement_objet ON "paiement"."encaissement" ("objet_type", "objet_uuid")`);
    await run(`
      CREATE TABLE "paiement"."lot_decaissement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "portefeuille_id" bigint NOT NULL REFERENCES "paiement"."portefeuille"("id"),
        "libelle" varchar(255) NOT NULL,
        "statut" varchar(16) NOT NULL DEFAULT 'brouillon' CHECK ("statut" IN ('brouillon','a_approuver','approuve','en_cours','termine','annule','rejete')),
        "nombre" integer NOT NULL DEFAULT 0 CHECK ("nombre" >= 0),
        "total" bigint NOT NULL DEFAULT 0 CHECK ("total" >= 0),
        "prepare_par" uuid NOT NULL,
        "approuve_par" uuid NULL,
        "approuve_le" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("approuve_par" IS NULL OR "approuve_par" <> "prepare_par")
      )`);
    await run(`
      CREATE TABLE "paiement"."decaissement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "portefeuille_id" bigint NOT NULL REFERENCES "paiement"."portefeuille"("id"),
        "agregateur_id" bigint NOT NULL REFERENCES "paiement"."agregateur"("id"),
        "mode_paiement_id" bigint NULL REFERENCES "paiement"."mode_paiement"("id"),
        "type" varchar(16) NOT NULL CHECK ("type" IN ('reversement','retrait','personnel','remboursement','test_validation')),
        "declencheur" varchar(20) NULL CHECK ("declencheur" IN ('auto_immediat','auto_quotidien','auto_hebdomadaire','manuel')),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "montant" bigint NOT NULL CHECK ("montant" > 0),
        "frais_a_charge" varchar(16) NOT NULL CHECK ("frais_a_charge" IN ('etablissement','beneficiaire')),
        "frais_agregateur" bigint NOT NULL DEFAULT 0 CHECK ("frais_agregateur" >= 0),
        "montant_debite" bigint NOT NULL CHECK ("montant_debite" > 0),
        "montant_recu" bigint NOT NULL CHECK ("montant_recu" > 0),
        "source_fonds" varchar(16) NOT NULL DEFAULT 'disponibles' CHECK ("source_fonds" IN ('disponibles','avance')),
        "avance_montant" bigint NOT NULL DEFAULT 0 CHECK ("avance_montant" >= 0),
        "commission_avance" bigint NOT NULL DEFAULT 0 CHECK ("commission_avance" >= 0),
        "compte_reception_id" bigint NULL REFERENCES "paiement"."compte_reception"("id"),
        "lot_id" bigint NULL REFERENCES "paiement"."lot_decaissement"("id"),
        "encaissement_id" bigint NULL REFERENCES "paiement"."encaissement"("id"),
        "beneficiaire_nom" varchar(255) NULL,
        "beneficiaire_telephone_chiffre" text NULL,
        "beneficiaire_telephone_masque" varchar(32) NULL,
        "beneficiaire_telephone_empreinte" char(64) NULL,
        "reference_marchande" varchar(64) NOT NULL,
        "reference_agregateur" varchar(128) NULL,
        "statut" varchar(24) NOT NULL DEFAULT 'brouillon',
        "statut_agregateur" varchar(48) NULL,
        "prepare_par" uuid NULL,
        "approuve_par" uuid NULL,
        "approuve_le" timestamptz NULL,
        "motif" text NULL,
        "motif_echec" text NULL,
        "envoye_le" timestamptz NULL,
        "termine_le" timestamptz NULL,
        "verifications" smallint NOT NULL DEFAULT 0,
        "prochaine_verification" timestamptz NULL,
        "cle_idempotence" varchar(128) NOT NULL,
        "metadonnees" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "version" bigint NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("approuve_par" IS NULL OR "prepare_par" IS NULL OR "approuve_par" <> "prepare_par"),
        CHECK (("frais_a_charge" = 'etablissement' AND "montant_debite" = "montant" + "frais_agregateur" AND "montant_recu" = "montant")
            OR ("frais_a_charge" = 'beneficiaire' AND "montant_debite" = "montant" AND "montant_recu" = "montant" - "frais_agregateur")),
        UNIQUE ("agregateur_id", "reference_marchande"),
        UNIQUE ("etablissement_uuid", "cle_idempotence")
      )`);
    await run(`CREATE UNIQUE INDEX uq_decaissement_ref_agregateur ON "paiement"."decaissement" ("agregateur_id", "reference_agregateur") WHERE "reference_agregateur" IS NOT NULL`);
    await run(`CREATE INDEX idx_decaissement_etab ON "paiement"."decaissement" ("etablissement_uuid", "created_at" DESC)`);
    await run(`CREATE INDEX idx_decaissement_a_verifier ON "paiement"."decaissement" ("prochaine_verification") WHERE "statut" IN ('soumis','en_cours','incertain')`);
    await run(`
      CREATE TABLE "paiement"."test_validation" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "compte_reception_id" bigint NOT NULL REFERENCES "paiement"."compte_reception"("id"),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "montant" bigint NOT NULL CHECK ("montant" > 0),
        "encaissement_id" bigint NULL REFERENCES "paiement"."encaissement"("id"),
        "decaissement_id" bigint NULL REFERENCES "paiement"."decaissement"("id"),
        "statut" varchar(16) NOT NULL DEFAULT 'en_cours',
        "cree_par" uuid NOT NULL,
        "motif_echec" text NULL,
        "termine_le" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`CREATE UNIQUE INDEX uq_test_en_cours ON "paiement"."test_validation" ("compte_reception_id") WHERE "statut" = 'en_cours'`);
    await run(`
      CREATE TABLE "paiement"."approbation" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NULL,
        "objet_type" varchar(24) NOT NULL CHECK ("objet_type" IN ('decaissement','lot','remboursement','accord','compte_reception')),
        "objet_uuid" uuid NOT NULL,
        "niveau" varchar(16) NOT NULL CHECK ("niveau" IN ('etablissement','super_admin')),
        "demandee_par" uuid NOT NULL,
        "decision" varchar(12) NOT NULL DEFAULT 'en_attente' CHECK ("decision" IN ('en_attente','approuve','rejete')),
        "decidee_par" uuid NULL,
        "decidee_le" timestamptz NULL,
        "motif" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("decidee_par" IS NULL OR "decidee_par" <> "demandee_par")
      )`);
    await run(`CREATE INDEX idx_approbation_attente ON "paiement"."approbation" ("niveau", "created_at") WHERE "decision" = 'en_attente'`);
    await run(`
      CREATE TABLE "paiement"."remboursement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "encaissement_id" bigint NOT NULL REFERENCES "paiement"."encaissement"("id"),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "montant" bigint NOT NULL CHECK ("montant" > 0),
        "motif" text NOT NULL,
        "mode" varchar(20) NOT NULL CHECK ("mode" IN ('payout_payeur','manuel_agregateur')),
        "statut" varchar(16) NOT NULL DEFAULT 'demande',
        "requiert_super_admin" boolean NOT NULL DEFAULT false,
        "demande_par" uuid NOT NULL,
        "approuve_par" uuid NULL,
        "approuve_le" timestamptz NULL,
        "decaissement_id" bigint NULL REFERENCES "paiement"."decaissement"("id"),
        "reference_agregateur" varchar(128) NULL,
        "version" bigint NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`CREATE INDEX idx_remboursement_encaissement ON "paiement"."remboursement" ("encaissement_id")`);

    /* ─────────────── Traces des agrégateurs ─────────────── */
    await run(`
      CREATE TABLE "paiement"."evenement_agregateur" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "agregateur_id" bigint NOT NULL REFERENCES "paiement"."agregateur"("id"),
        "evenement_externe_id" varchar(128) NULL,
        "type" varchar(96) NOT NULL,
        "empreinte_corps" char(64) NOT NULL,
        "corps" jsonb NOT NULL,
        "entetes" jsonb NULL,
        "ip" inet NULL,
        "signature_valide" boolean NOT NULL,
        "statut" varchar(12) NOT NULL DEFAULT 'recu' CHECK ("statut" IN ('recu','traite','ignore','erreur')),
        "tentatives" smallint NOT NULL DEFAULT 0,
        "erreur" text NULL,
        "recu_le" timestamptz NOT NULL DEFAULT now(),
        "traite_le" timestamptz NULL,
        UNIQUE ("agregateur_id", "empreinte_corps")
      )`);
    await run(`CREATE INDEX idx_evenement_agregateur_a_traiter ON "paiement"."evenement_agregateur" ("recu_le") WHERE "statut" IN ('recu','erreur')`);
    await run(`
      CREATE TABLE "paiement"."appel_agregateur" (
        "id" BIGSERIAL PRIMARY KEY,
        "agregateur_id" bigint NOT NULL REFERENCES "paiement"."agregateur"("id"),
        "operation" varchar(64) NOT NULL,
        "reference_marchande" varchar(64) NULL,
        "methode" varchar(8) NOT NULL,
        "chemin" text NOT NULL,
        "requete" jsonb NULL,
        "reponse" jsonb NULL,
        "http_status" smallint NULL,
        "duree_ms" integer NULL,
        "erreur" text NULL,
        "correlation_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`CREATE INDEX idx_appel_agregateur_ref ON "paiement"."appel_agregateur" ("reference_marchande")`);
    await run(`
      CREATE TABLE "paiement"."reconciliation" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "agregateur_id" bigint NOT NULL REFERENCES "paiement"."agregateur"("id"),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "solde_agregateur" bigint NOT NULL,
        "solde_interne" bigint NOT NULL,
        "ecart" bigint NOT NULL,
        "statut" varchar(8) NOT NULL CHECK ("statut" IN ('ok','ecart','erreur')),
        "details" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    /* ─────────────── Reçus ─────────────── */
    await run(`
      CREATE TABLE "paiement"."sequence_recu" (
        "etablissement_uuid" uuid NOT NULL,
        "annee" smallint NOT NULL,
        "derniere_sequence" bigint NOT NULL,
        PRIMARY KEY ("etablissement_uuid", "annee")
      )`);
    // Numérotation sans trou : l'incrément est dans la MÊME transaction que l'insertion du reçu (annulée avec elle)
    await run(`
      CREATE FUNCTION "paiement".prochaine_sequence_recu(p_etab uuid, p_annee smallint) RETURNS bigint LANGUAGE plpgsql AS $$
      DECLARE v bigint;
      BEGIN
        INSERT INTO "paiement"."sequence_recu" (etablissement_uuid, annee, derniere_sequence) VALUES (p_etab, p_annee, 1)
        ON CONFLICT (etablissement_uuid, annee) DO UPDATE SET derniere_sequence = "paiement"."sequence_recu".derniere_sequence + 1
        RETURNING derniere_sequence INTO v;
        RETURN v;
      END $$`);
    await run(`
      CREATE TABLE "paiement"."recu" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NOT NULL,
        "annee" smallint NOT NULL,
        "sequence" bigint NOT NULL,
        "numero" varchar(40) NOT NULL,
        "type" varchar(16) NOT NULL CHECK ("type" IN ('encaissement','decaissement','remboursement')),
        "objet_uuid" uuid NOT NULL,
        "montant" bigint NOT NULL CHECK ("montant" > 0),
        "devise" varchar(3) NOT NULL REFERENCES "paiement"."devise"("code"),
        "donnees_figees" jsonb NOT NULL,
        "empreinte_sha256" char(64) NOT NULL,
        "stockage_cle" varchar(255) NOT NULL,
        "signataire" varchar(255) NOT NULL,
        "signe_le" timestamptz NOT NULL,
        "code_verification" varchar(40) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("etablissement_uuid", "annee", "sequence"),
        UNIQUE ("etablissement_uuid", "numero"),
        UNIQUE ("type", "objet_uuid")
      )`);
    await run(`
      CREATE TABLE "paiement"."acces_recu" (
        "id" BIGSERIAL PRIMARY KEY,
        "etablissement_uuid" uuid NOT NULL,
        "utilisateur_uuid" uuid NOT NULL,
        "peut_lire" boolean NOT NULL DEFAULT true,
        "peut_telecharger" boolean NOT NULL DEFAULT false,
        "peut_renvoyer" boolean NOT NULL DEFAULT false,
        "actif" boolean NOT NULL DEFAULT true,
        "accorde_par" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("etablissement_uuid", "utilisateur_uuid")
      )`);
    await run(`
      CREATE TABLE "paiement"."lien_telechargement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "recu_id" bigint NOT NULL REFERENCES "paiement"."recu"("id"),
        "jeton_hash" char(64) NOT NULL UNIQUE,
        "destinataire_type" varchar(12) NOT NULL CHECK ("destinataire_type" IN ('payeur','utilisateur')),
        "destinataire_utilisateur_uuid" uuid NULL,
        "code_hash" char(64) NULL,
        "tentatives" smallint NOT NULL DEFAULT 0,
        "tentatives_max" smallint NOT NULL DEFAULT 5,
        "utilisations" smallint NOT NULL DEFAULT 0,
        "utilisations_max" smallint NOT NULL DEFAULT 10,
        "expire_le" timestamptz NOT NULL,
        "revoque" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    /* ─────────────── Notifications ─────────────── */
    await run(`
      CREATE TABLE "paiement"."notification" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "etablissement_uuid" uuid NULL,
        "utilisateur_uuid" uuid NULL,
        "canal" varchar(10) NOT NULL CHECK ("canal" IN ('site','email','sms','whatsapp')),
        "evenement" varchar(96) NOT NULL,
        "titre" varchar(255) NOT NULL,
        "corps" text NOT NULL,
        "donnees" jsonb NULL,
        "destinataire_masque" varchar(64) NULL,
        "statut" varchar(10) NOT NULL DEFAULT 'en_attente' CHECK ("statut" IN ('en_attente','envoye','echoue','lu')),
        "tentatives" smallint NOT NULL DEFAULT 0,
        "prochaine_tentative" timestamptz NULL DEFAULT now(),
        "erreur" text NULL,
        "envoye_le" timestamptz NULL,
        "lu_le" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await run(`CREATE INDEX idx_notification_a_envoyer ON "paiement"."notification" ("prochaine_tentative") WHERE "statut" = 'en_attente'`);
    await run(`CREATE INDEX idx_notification_utilisateur ON "paiement"."notification" ("utilisateur_uuid", "created_at" DESC)`);
    await run(`
      CREATE TABLE "paiement"."preference_notification" (
        "utilisateur_uuid" uuid NOT NULL,
        "canal" varchar(10) NOT NULL CHECK ("canal" IN ('site','email','sms','whatsapp')),
        "evenement" varchar(96) NOT NULL DEFAULT '*',
        "actif" boolean NOT NULL DEFAULT true,
        PRIMARY KEY ("utilisateur_uuid", "canal", "evenement")
      )`);

    /* ─────────────── Journal d'audit chaîné ─────────────── */
    await run(`
      CREATE TABLE "paiement"."audit_evenement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "flux" varchar(64) NOT NULL,
        "rang" bigint NOT NULL,
        "etablissement_uuid" uuid NULL,
        "acteur_uuid" uuid NULL,
        "acteur_role" varchar(48) NULL,
        "action" varchar(96) NOT NULL,
        "objet_type" varchar(48) NULL,
        "objet_uuid" uuid NULL,
        "avant" jsonb NULL,
        "apres" jsonb NULL,
        "resultat" varchar(8) NOT NULL DEFAULT 'succes' CHECK ("resultat" IN ('succes','echec','refus')),
        "motif" text NULL,
        "ip" inet NULL,
        "user_agent" varchar(512) NULL,
        "correlation_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
        "prev_hash" char(64) NOT NULL,
        "hash" char(64) NOT NULL,
        UNIQUE ("flux", "rang")
      )`);
    await run(`CREATE INDEX idx_audit_etab ON "paiement"."audit_evenement" ("etablissement_uuid", "created_at" DESC)`);
    await run(`CREATE INDEX idx_audit_acteur ON "paiement"."audit_evenement" ("acteur_uuid", "created_at" DESC)`);
    await run(`CREATE INDEX idx_audit_objet ON "paiement"."audit_evenement" ("objet_type", "objet_uuid")`);
    await run(`CREATE INDEX idx_audit_correlation ON "paiement"."audit_evenement" ("correlation_id")`);
    await run(`
      CREATE FUNCTION "paiement".audit_hash(e "paiement"."audit_evenement") RETURNS text LANGUAGE sql IMMUTABLE AS $$
        SELECT encode(sha256(convert_to(
          e.prev_hash || '|' || e.rang || '|' || e.flux || '|' || COALESCE(e.etablissement_uuid::text, '') || '|' ||
          COALESCE(e.acteur_uuid::text, '') || '|' || COALESCE(e.acteur_role, '') || '|' || e.action || '|' ||
          COALESCE(e.objet_type, '') || '|' || COALESCE(e.objet_uuid::text, '') || '|' ||
          COALESCE(e.avant::text, '') || '|' || COALESCE(e.apres::text, '') || '|' || e.resultat || '|' ||
          COALESCE(e.motif, '') || '|' || to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), 'UTF8')), 'hex')
      $$`);
    await run(`
      CREATE FUNCTION "paiement".audit_chainer() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE derniere record;
      BEGIN
        NEW.flux := COALESCE(NEW.etablissement_uuid::text, 'plateforme');
        PERFORM pg_advisory_xact_lock(hashtextextended('audit:' || NEW.flux, 0));
        SELECT rang, hash INTO derniere FROM "paiement"."audit_evenement" WHERE flux = NEW.flux ORDER BY rang DESC LIMIT 1;
        NEW.rang := COALESCE(derniere.rang, 0) + 1;
        NEW.prev_hash := COALESCE(derniere.hash, repeat('0', 64));
        NEW.created_at := clock_timestamp();
        NEW.hash := "paiement".audit_hash(NEW);
        RETURN NEW;
      END $$`);
    await run(`CREATE TRIGGER trg_audit_chainer BEFORE INSERT ON "paiement"."audit_evenement"
               FOR EACH ROW EXECUTE FUNCTION "paiement".audit_chainer()`);
    // Vérifie un flux : renvoie la première rupture (aucune ligne = chaîne intègre)
    await run(`
      CREATE FUNCTION "paiement".audit_verifier(p_flux text) RETURNS TABLE (rang_rompu bigint, motif text) LANGUAGE plpgsql STABLE AS $$
      DECLARE prev text := repeat('0', 64); r "paiement"."audit_evenement"%ROWTYPE; attendu bigint := 1;
      BEGIN
        FOR r IN SELECT * FROM "paiement"."audit_evenement" WHERE flux = p_flux ORDER BY rang LOOP
          IF r.rang <> attendu THEN RETURN QUERY SELECT r.rang, 'rang manquant'::text; RETURN; END IF;
          IF r.prev_hash <> prev THEN RETURN QUERY SELECT r.rang, 'chainage rompu'::text; RETURN; END IF;
          IF r.hash <> "paiement".audit_hash(r) THEN RETURN QUERY SELECT r.rang, 'empreinte invalide'::text; RETURN; END IF;
          prev := r.hash; attendu := attendu + 1;
        END LOOP;
      END $$`);

    /* ─────────────── Outbox, idempotence, interrupteurs ─────────────── */
    await run(`
      CREATE TABLE "paiement"."outbox_evenement" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "topic" varchar(96) NOT NULL,
        "cle_partition" varchar(64) NULL,
        "payload" jsonb NOT NULL,
        "statut" varchar(10) NOT NULL DEFAULT 'en_attente' CHECK ("statut" IN ('en_attente','publie','echoue')),
        "tentatives" smallint NOT NULL DEFAULT 0,
        "prochaine_tentative" timestamptz NOT NULL DEFAULT now(),
        "erreur" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "publie_le" timestamptz NULL
      )`);
    await run(`CREATE INDEX idx_outbox_a_publier ON "paiement"."outbox_evenement" ("prochaine_tentative") WHERE "statut" = 'en_attente'`);
    await run(`
      CREATE TABLE "paiement"."idempotence" (
        "portee" varchar(80) NOT NULL,
        "cle" varchar(128) NOT NULL,
        "empreinte_requete" char(64) NOT NULL,
        "statut_http" smallint NULL,
        "reponse" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expire_le" timestamptz NOT NULL,
        PRIMARY KEY ("portee", "cle")
      )`);
    await run(`
      CREATE TABLE "paiement"."interrupteur_securite" (
        "id" BIGSERIAL PRIMARY KEY,
        "uuid" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        "portee" varchar(16) NOT NULL CHECK ("portee" IN ('global','agregateur','mode','etablissement','portefeuille')),
        "cible_uuid" uuid NULL,
        "actif" boolean NOT NULL DEFAULT true,
        "motif" text NOT NULL,
        "active_par" uuid NOT NULL,
        "active_le" timestamptz NOT NULL DEFAULT now(),
        "desactive_par" uuid NULL,
        "desactive_le" timestamptz NULL,
        CHECK (("portee" = 'global') = ("cible_uuid" IS NULL))
      )`);
    await run(`CREATE UNIQUE INDEX uq_interrupteur_actif ON "paiement"."interrupteur_securite" ("portee", COALESCE("cible_uuid", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "actif"`);

    /* ─────────────── États et transitions contrôlés par la base ─────────────── */
    await run(`
      CREATE TABLE "paiement"."etat_transition" (
        "objet" varchar(48) NOT NULL,
        "de" varchar(32) NULL,
        "vers" varchar(32) NOT NULL
      )`);
    await run(`CREATE UNIQUE INDEX uq_etat_transition ON "paiement"."etat_transition" ("objet", COALESCE("de", ''), "vers")`);
    await run(`
      CREATE TABLE "paiement"."historique_statut" (
        "id" BIGSERIAL PRIMARY KEY,
        "objet" varchar(48) NOT NULL,
        "objet_id" bigint NOT NULL,
        "objet_uuid" uuid NOT NULL,
        "de" varchar(32) NULL,
        "vers" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT clock_timestamp()
      )`);
    await run(`CREATE INDEX idx_historique_objet ON "paiement"."historique_statut" ("objet", "objet_id", "id")`);
    for (const [objet, m] of Object.entries(MACHINES)) {
      for (const vers of m.initiaux) await run(`INSERT INTO "paiement"."etat_transition" (objet, de, vers) VALUES ('${objet}', NULL, '${vers}')`);
      for (const [de, liste] of Object.entries(m.transitions)) {
        for (const vers of liste) await run(`INSERT INTO "paiement"."etat_transition" (objet, de, vers) VALUES ('${objet}', '${de}', '${vers}')`);
      }
    }
    await run(`
      CREATE FUNCTION "paiement".verifier_transition() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NOT EXISTS (SELECT 1 FROM "paiement"."etat_transition" WHERE objet = TG_TABLE_NAME AND de IS NULL AND vers = NEW.statut) THEN
            RAISE EXCEPTION 'Etat initial interdit pour % : %', TG_TABLE_NAME, NEW.statut USING ERRCODE = '23514';
          END IF;
        ELSIF NEW.statut IS DISTINCT FROM OLD.statut THEN
          IF NOT EXISTS (SELECT 1 FROM "paiement"."etat_transition" WHERE objet = TG_TABLE_NAME AND de = OLD.statut AND vers = NEW.statut) THEN
            RAISE EXCEPTION 'Transition interdite pour % : % -> %', TG_TABLE_NAME, OLD.statut, NEW.statut USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END $$`);
    await run(`
      CREATE FUNCTION "paiement".journaliser_statut() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' OR NEW.statut IS DISTINCT FROM OLD.statut THEN
          INSERT INTO "paiement"."historique_statut" (objet, objet_id, objet_uuid, de, vers)
          VALUES (TG_TABLE_NAME, NEW.id, NEW.uuid, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.statut END, NEW.statut);
        END IF;
        RETURN NULL;
      END $$`);
    for (const t of Object.keys(MACHINES)) {
      await run(`CREATE TRIGGER trg_transition BEFORE INSERT OR UPDATE OF statut ON "paiement"."${t}"
                 FOR EACH ROW EXECUTE FUNCTION "paiement".verifier_transition()`);
      await run(`CREATE TRIGGER trg_historique AFTER INSERT OR UPDATE OF statut ON "paiement"."${t}"
                 FOR EACH ROW EXECUTE FUNCTION "paiement".journaliser_statut()`);
    }

    /* ─────────────── updated_at, tables en ajout seul, isolation par établissement ─────────────── */
    for (const t of TABLES_AVEC_UPDATED_AT) {
      await run(`CREATE TRIGGER trg_touch BEFORE UPDATE ON "paiement"."${t}" FOR EACH ROW EXECUTE FUNCTION "paiement".touch_updated_at()`);
    }
    for (const t of TABLES_EN_AJOUT_SEUL) {
      await run(`CREATE TRIGGER trg_ajout_seul BEFORE UPDATE OR DELETE ON "paiement"."${t}" FOR EACH ROW EXECUTE FUNCTION "paiement".interdire_modification()`);
      await run(`CREATE TRIGGER trg_ajout_seul_truncate BEFORE TRUNCATE ON "paiement"."${t}" FOR EACH STATEMENT EXECUTE FUNCTION "paiement".interdire_modification()`);
    }
    // Isolation : le service renseigne app.role / app.etablissement par transaction (voir database/contexte.ts).
    // En production, exécuter l'application avec un rôle SANS droit de propriétaire (voir docs/roles.sql).
    for (const t of TABLES_ISOLEES_PAR_ETABLISSEMENT) {
      await run(`ALTER TABLE "paiement"."${t}" ENABLE ROW LEVEL SECURITY`);
      await run(`CREATE POLICY isolation ON "paiement"."${t}"
                 USING ("paiement".acces_etablissement(etablissement_uuid)) WITH CHECK ("paiement".acces_etablissement(etablissement_uuid))`);
    }

    /* ─────────────── Données de référence ─────────────── */
    await run(`
      INSERT INTO "paiement"."devise" (code, nom, exposant) VALUES
        ('XOF', 'Franc CFA (UEMOA)', 0), ('XAF', 'Franc CFA (CEMAC)', 0), ('GNF', 'Franc guineen', 0), ('CDF', 'Franc congolais', 2)`);
    await run(`INSERT INTO "paiement"."parametre_plateforme" (devise) SELECT code FROM "paiement"."devise"`);
    await run(`INSERT INTO "paiement"."agregateur" (code, nom) VALUES ('fedapay', 'FedaPay'), ('cinetpay', 'CinetPay')`);
  }

  public async down(q: QueryRunner): Promise<void> {
    // Garde-fou : on ne détruit jamais un grand livre qui contient des écritures.
    await q.query(`
      DO $$ BEGIN
        IF to_regclass('"paiement"."ecriture"') IS NOT NULL AND EXISTS (SELECT 1 FROM "paiement"."ecriture") THEN
          RAISE EXCEPTION 'Annulation refusee : le grand livre contient des ecritures comptables';
        END IF;
      END $$`);
    await q.query(`DROP SCHEMA IF EXISTS "paiement" CASCADE`);
  }
}
