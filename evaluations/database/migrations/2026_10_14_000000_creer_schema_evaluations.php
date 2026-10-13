<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Schéma `evaluations` (README plateforme, règle n°1) + fonction de verrouillage
 * partagée par les tables immuables (audit, instantanés de bulletins).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS evaluations');

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
