<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fonction de verrouillage partagée par les tables immuables (audit, instantanés de bulletins).
 *
 * Le schéma `evaluations` est un PRÉREQUIS créé une seule fois avant la première migration
 * (README, §1) : il ne peut pas être créé ici, car la table `migrations` de Laravel y est
 * créée avant toute migration. Pas de CREATE SCHEMA ici : sur une base partagée, le rôle
 * applicatif n'a pas forcément le droit CREATE sur la base, et l'instruction échoue même
 * quand le schéma existe déjà (le contrôle de droit passe avant le IF NOT EXISTS).
 */
return new class extends Migration
{
    public function up(): void
    {
        $existe = DB::selectOne("SELECT 1 AS ok FROM pg_namespace WHERE nspname = 'evaluations'");
        if ($existe === null) {
            throw new RuntimeException('Le schéma "evaluations" n\'existe pas : créez-le une fois avant de migrer (README, §1).');
        }

        // Toute tentative d'UPDATE/DELETE sur une table journal est refusée par la base
        // elle-même, quel que soit le code applicatif (défense en profondeur).
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION evaluations.refuser_modification()
            RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                RAISE EXCEPTION 'Table % immuable : % interdit', TG_TABLE_NAME, TG_OP
                    USING ERRCODE = 'insufficient_privilege';
            END;
            $$;
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS evaluations.refuser_modification() CASCADE');
    }
};
