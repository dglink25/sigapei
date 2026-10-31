<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Paramétrage par établissement :
 *  - parametres : devise, séparation des tâches sur les règlements saisis à la main, paliers de relance ;
 *  - formules_tarifaires : frais par portée (cycle, niveau ou classe) et année, avec échéancier (somme = montant) ;
 *  - permissions_role : grille rôle x action (l'administrateur peut tout, règle du code) ;
 *  - compteurs : numérotation sans trou des factures (FA-) et des reçus (RE-) par établissement et par année.
 * Montants : entiers en unités de la devise (FCFA : pas de décimale), jamais de nombre à virgule.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE TABLE finances.parametres (
              etablissement_uuid uuid PRIMARY KEY,
              devise varchar(3) NOT NULL DEFAULT 'XOF',
              double_validation_reglements boolean NOT NULL DEFAULT true,
              relance_jours_avant smallint NOT NULL DEFAULT 7,
              relance_jours_apres jsonb NOT NULL DEFAULT '[1, 7, 15]'::jsonb,
              mentions_recu varchar(1000),
              modifie_par_uuid uuid NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT parametres_devise_chk CHECK (devise ~ '^[A-Z]{3}$'),
              CONSTRAINT parametres_relance_chk CHECK (relance_jours_avant BETWEEN 0 AND 60 AND jsonb_typeof(relance_jours_apres) = 'array')
            );

            CREATE TABLE finances.formules_tarifaires (
              id bigserial PRIMARY KEY,
              uuid uuid NOT NULL UNIQUE,
              etablissement_uuid uuid NOT NULL,
              code varchar(60) NOT NULL,
              libelle varchar(150) NOT NULL,
              nature varchar(20) NOT NULL,
              annee_scolaire varchar(9) NOT NULL,
              cycle varchar(20),
              niveau varchar(60),
              classe_uuid uuid,
              montant bigint NOT NULL,
              echeancier jsonb NOT NULL,
              actif boolean NOT NULL DEFAULT true,
              modifie_par_uuid uuid NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT formules_code_unique UNIQUE (etablissement_uuid, annee_scolaire, code),
              CONSTRAINT formules_nature_chk CHECK (nature IN ('scolarite','inscription','cantine','transport','activite','dossier','autre')),
              CONSTRAINT formules_annee_chk CHECK (annee_scolaire ~ '^[0-9]{4}-[0-9]{4}$'),
              CONSTRAINT formules_montant_chk CHECK (montant > 0 AND montant <= 100000000000),
              CONSTRAINT formules_echeancier_chk CHECK (jsonb_typeof(echeancier) = 'array' AND jsonb_array_length(echeancier) BETWEEN 1 AND 24)
            );
            CREATE INDEX formules_portee_idx ON finances.formules_tarifaires (etablissement_uuid, annee_scolaire, actif);

            CREATE TABLE finances.permissions_role (
              id bigserial PRIMARY KEY,
              etablissement_uuid uuid NOT NULL,
              role_code varchar(64) NOT NULL,
              action varchar(40) NOT NULL,
              accorde_par_uuid uuid NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              CONSTRAINT permissions_role_unique UNIQUE (etablissement_uuid, role_code, action),
              CONSTRAINT permissions_role_action_chk CHECK (action IN ('consulter_finances','gerer_tarifs','emettre_factures',
                'annuler_facture','saisir_reglement','valider_reglement','consulter_rapports'))
            );

            CREATE TABLE finances.compteurs (
              etablissement_uuid uuid NOT NULL,
              nature varchar(4) NOT NULL,
              annee smallint NOT NULL,
              valeur integer NOT NULL DEFAULT 0,
              PRIMARY KEY (etablissement_uuid, nature, annee)
            );

            CREATE TABLE finances.journal_audit (
              id bigserial PRIMARY KEY,
              etablissement_uuid uuid NOT NULL,
              action varchar(60) NOT NULL,
              cible_type varchar(40) NOT NULL,
              cible_uuid uuid,
              auteur_uuid uuid NOT NULL,
              auteur_role varchar(64) NOT NULL,
              details jsonb NOT NULL DEFAULT '{}'::jsonb,
              cree_le timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX journal_audit_idx ON finances.journal_audit (etablissement_uuid, cree_le DESC);
            CREATE TRIGGER journal_audit_immuable BEFORE UPDATE OR DELETE ON finances.journal_audit
              FOR EACH ROW EXECUTE FUNCTION finances.refuser_modification();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TABLE IF EXISTS finances.journal_audit, finances.compteurs, finances.permissions_role, finances.formules_tarifaires, finances.parametres');
    }
};
