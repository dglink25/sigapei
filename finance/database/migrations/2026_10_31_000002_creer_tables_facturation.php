<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Facturation et règlements (CDC §5) :
 *  - factures : montants figés à l'émission ; montant_regle = somme des règlements validés (tenue par la base) ;
 *    statut emise -> partiellement_reglee -> reglee, ou annulee (motif obligatoire, seulement sans règlement) ;
 *  - facture_lignes / echeances : en ajout seul ;
 *  - reglements : en ligne (encaissement du service Paiement, confirmé par Paiement lui-même), espèces, virement,
 *    chèque (saisis par un profil habilité, validés par un AUTRE profil si la séparation des tâches est active) ;
 *    un règlement validé ou rejeté ne change plus ; jamais de suppression ;
 *  - paiements_en_ligne : demandes d'encaissement transmises à Paiement, pour suivi et resynchronisation ;
 *  - relances : une seule relance par échéance et par palier.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TABLE finances.factures (
              id bigserial PRIMARY KEY,
              uuid uuid NOT NULL UNIQUE,
              etablissement_uuid uuid NOT NULL,
              numero varchar(30) NOT NULL,
              apprenant_uuid uuid NOT NULL,
              apprenant_nom varchar(200) NOT NULL,
              apprenant_matricule varchar(60),
              classe_uuid uuid,
              classe_nom varchar(120),
              annee_scolaire varchar(9) NOT NULL,
              libelle varchar(200) NOT NULL,
              devise varchar(3) NOT NULL,
              montant_total bigint NOT NULL,
              montant_regle bigint NOT NULL DEFAULT 0,
              statut varchar(24) NOT NULL DEFAULT 'emise',
              emise_par_uuid uuid NOT NULL,
              motif_annulation varchar(1000),
              annulee_par_uuid uuid,
              annulee_le timestamptz,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT factures_numero_unique UNIQUE (etablissement_uuid, numero),
              CONSTRAINT factures_montants_chk CHECK (montant_total > 0 AND montant_regle >= 0 AND montant_regle <= montant_total),
              CONSTRAINT factures_statut_chk CHECK (statut IN ('emise','partiellement_reglee','reglee','annulee')),
              CONSTRAINT factures_statut_coherent_chk CHECK (
                (statut = 'annulee' AND montant_regle = 0 AND motif_annulation IS NOT NULL AND annulee_par_uuid IS NOT NULL)
                OR (statut = 'emise' AND montant_regle = 0)
                OR (statut = 'partiellement_reglee' AND montant_regle > 0 AND montant_regle < montant_total)
                OR (statut = 'reglee' AND montant_regle = montant_total))
            );
            CREATE INDEX factures_apprenant_idx ON finances.factures (etablissement_uuid, apprenant_uuid, created_at DESC);
            CREATE INDEX factures_statut_idx ON finances.factures (etablissement_uuid, statut, created_at DESC);
            CREATE INDEX factures_classe_idx ON finances.factures (etablissement_uuid, classe_uuid, annee_scolaire);

            -- Montants, apprenant et numéro d'une facture ne changent jamais ; une facture n'est jamais supprimée.
            CREATE OR REPLACE FUNCTION finances.facture_figee() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.montant_total <> OLD.montant_total OR NEW.numero <> OLD.numero OR NEW.apprenant_uuid <> OLD.apprenant_uuid
                 OR NEW.devise <> OLD.devise OR NEW.etablissement_uuid <> OLD.etablissement_uuid THEN
                RAISE EXCEPTION 'Facture emise : montant, numero, apprenant et devise sont figes' USING ERRCODE = 'insufficient_privilege';
              END IF;
              IF OLD.statut = 'annulee' THEN
                RAISE EXCEPTION 'Facture annulee : plus aucune modification' USING ERRCODE = 'insufficient_privilege';
              END IF;
              RETURN NEW;
            END $$;
            CREATE TRIGGER factures_figees BEFORE UPDATE ON finances.factures FOR EACH ROW EXECUTE FUNCTION finances.facture_figee();
            CREATE TRIGGER factures_sans_suppression BEFORE DELETE ON finances.factures FOR EACH ROW EXECUTE FUNCTION finances.refuser_modification();

            CREATE TABLE finances.facture_lignes (
              id bigserial PRIMARY KEY,
              facture_id bigint NOT NULL REFERENCES finances.factures(id) ON DELETE RESTRICT,
              ordre smallint NOT NULL,
              libelle varchar(200) NOT NULL,
              nature varchar(20) NOT NULL,
              formule_uuid uuid,
              montant bigint NOT NULL CHECK (montant > 0),
              UNIQUE (facture_id, ordre)
            );
            CREATE INDEX facture_lignes_formule_idx ON finances.facture_lignes (formule_uuid);
            CREATE TRIGGER facture_lignes_immuables BEFORE UPDATE OR DELETE ON finances.facture_lignes FOR EACH ROW EXECUTE FUNCTION finances.refuser_modification();

            CREATE TABLE finances.echeances (
              id bigserial PRIMARY KEY,
              facture_id bigint NOT NULL REFERENCES finances.factures(id) ON DELETE RESTRICT,
              rang smallint NOT NULL,
              libelle varchar(120) NOT NULL,
              date_echeance date NOT NULL,
              montant bigint NOT NULL CHECK (montant > 0),
              UNIQUE (facture_id, rang)
            );
            CREATE INDEX echeances_date_idx ON finances.echeances (date_echeance);
            CREATE TRIGGER echeances_immuables BEFORE UPDATE OR DELETE ON finances.echeances FOR EACH ROW EXECUTE FUNCTION finances.refuser_modification();

            CREATE TABLE finances.paiements_en_ligne (
              id bigserial PRIMARY KEY,
              uuid uuid NOT NULL UNIQUE,
              etablissement_uuid uuid NOT NULL,
              facture_id bigint NOT NULL REFERENCES finances.factures(id) ON DELETE RESTRICT,
              encaissement_uuid uuid UNIQUE,
              montant bigint NOT NULL CHECK (montant > 0),
              statut varchar(24) NOT NULL DEFAULT 'initie',
              url_paiement text,
              expire_le timestamptz,
              initie_par_uuid uuid NOT NULL,
              derniere_synchro timestamptz,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT paiements_statut_chk CHECK (statut IN ('initie','en_attente','approuve','refuse','annule','expire','disponible','rembourse_partiel','rembourse','echec_creation'))
            );
            CREATE INDEX paiements_a_suivre_idx ON finances.paiements_en_ligne (statut, created_at) WHERE statut IN ('initie','en_attente');
            CREATE TRIGGER paiements_sans_suppression BEFORE DELETE ON finances.paiements_en_ligne FOR EACH ROW EXECUTE FUNCTION finances.refuser_modification();

            CREATE TABLE finances.reglements (
              id bigserial PRIMARY KEY,
              uuid uuid NOT NULL UNIQUE,
              etablissement_uuid uuid NOT NULL,
              facture_id bigint NOT NULL REFERENCES finances.factures(id) ON DELETE RESTRICT,
              mode varchar(16) NOT NULL,
              montant bigint NOT NULL,
              statut varchar(16) NOT NULL,
              date_reglement date NOT NULL,
              encaissement_uuid uuid,
              piece_reference varchar(120),
              commentaire varchar(500),
              saisi_par_uuid uuid,
              valide_par_uuid uuid,
              valide_le timestamptz,
              motif_rejet varchar(1000),
              numero_recu varchar(30),
              auto_valide boolean NOT NULL DEFAULT false,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT reglements_mode_chk CHECK (mode IN ('en_ligne','especes','virement','cheque')),
              CONSTRAINT reglements_montant_chk CHECK (montant <> 0),
              CONSTRAINT reglements_statut_chk CHECK (statut IN ('a_valider','valide','rejete')),
              CONSTRAINT reglements_en_ligne_chk CHECK ((mode = 'en_ligne') = (encaissement_uuid IS NOT NULL)),
              CONSTRAINT reglements_manuel_chk CHECK (mode = 'en_ligne' OR (montant > 0 AND saisi_par_uuid IS NOT NULL AND piece_reference IS NOT NULL)),
              -- Séparation des tâches : celui qui saisit ne valide pas, sauf si l'établissement l'a désactivée (tracé : auto_valide).
              CONSTRAINT reglements_separation_chk CHECK (valide_par_uuid IS NULL OR saisi_par_uuid IS NULL OR valide_par_uuid <> saisi_par_uuid OR auto_valide),
              CONSTRAINT reglements_negatif_chk CHECK (montant > 0 OR (mode = 'en_ligne' AND statut = 'valide')),
              CONSTRAINT reglements_rejet_chk CHECK (statut <> 'rejete' OR motif_rejet IS NOT NULL),
              CONSTRAINT reglements_recu_unique UNIQUE (etablissement_uuid, numero_recu)
            );
            -- Un encaissement Paiement ne peut être compté qu'une fois en positif et une fois par remboursement cumulé.
            CREATE UNIQUE INDEX reglements_encaissement_unique ON finances.reglements (encaissement_uuid) WHERE encaissement_uuid IS NOT NULL AND montant > 0;
            CREATE INDEX reglements_facture_idx ON finances.reglements (facture_id, statut);
            CREATE INDEX reglements_etab_idx ON finances.reglements (etablissement_uuid, statut, date_reglement DESC);

            -- Un règlement validé ou rejeté est définitif ; jamais de suppression.
            CREATE OR REPLACE FUNCTION finances.reglement_fige() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF OLD.statut <> 'a_valider' THEN
                RAISE EXCEPTION 'Reglement % : plus aucune modification', OLD.statut USING ERRCODE = 'insufficient_privilege';
              END IF;
              IF NEW.montant <> OLD.montant OR NEW.facture_id <> OLD.facture_id OR NEW.mode <> OLD.mode THEN
                RAISE EXCEPTION 'Montant, facture et mode d''un reglement sont figes' USING ERRCODE = 'insufficient_privilege';
              END IF;
              RETURN NEW;
            END $$;
            CREATE TRIGGER reglements_figes BEFORE UPDATE ON finances.reglements FOR EACH ROW EXECUTE FUNCTION finances.reglement_fige();
            CREATE TRIGGER reglements_sans_suppression BEFORE DELETE ON finances.reglements FOR EACH ROW EXECUTE FUNCTION finances.refuser_modification();

            -- La base tient elle-même le montant réglé et le statut de la facture : aucun écart possible.
            CREATE OR REPLACE FUNCTION finances.recalculer_facture() RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE total bigint; regle bigint;
            BEGIN
              SELECT montant_total INTO total FROM finances.factures WHERE id = NEW.facture_id FOR UPDATE;
              SELECT COALESCE(SUM(montant), 0) INTO regle FROM finances.reglements WHERE facture_id = NEW.facture_id AND statut = 'valide';
              IF regle > total THEN
                RAISE EXCEPTION 'Le total des reglements depasse le montant de la facture' USING ERRCODE = 'check_violation';
              END IF;
              UPDATE finances.factures SET montant_regle = regle,
                statut = CASE WHEN regle = 0 THEN 'emise' WHEN regle < total THEN 'partiellement_reglee' ELSE 'reglee' END,
                updated_at = now()
               WHERE id = NEW.facture_id AND statut <> 'annulee';
              RETURN NULL;
            END $$;
            CREATE TRIGGER reglements_recalcul AFTER INSERT OR UPDATE OF statut ON finances.reglements
              FOR EACH ROW EXECUTE FUNCTION finances.recalculer_facture();

            CREATE TABLE finances.relances (
              id bigserial PRIMARY KEY,
              echeance_id bigint NOT NULL REFERENCES finances.echeances(id) ON DELETE RESTRICT,
              palier smallint NOT NULL,
              envoyee_le timestamptz NOT NULL DEFAULT now(),
              UNIQUE (echeance_id, palier)
            );
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TABLE IF EXISTS finances.relances, finances.reglements, finances.paiements_en_ligne, finances.echeances, finances.facture_lignes, finances.factures;
            DROP FUNCTION IF EXISTS finances.recalculer_facture(), finances.reglement_fige(), finances.facture_figee();
        SQL);
    }
};
