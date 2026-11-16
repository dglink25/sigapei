<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Le schéma "finances" est un prérequis créé une seule fois (README) : une migration ne peut pas le créer,
 * la table des migrations y étant créée avant. On vérifie sa présence et on crée la fonction qui rend
 * certaines tables immuables (journal, lignes de facture, règlements validés).
 *
 * Ancienne version du module (migrations 2025_01_01_*, jamais utilisée en production) : si ses tables existent
 * encore, elles sont supprimées UNIQUEMENT si elles sont toutes vides ; sinon la migration s'arrête sans rien
 * toucher (aucune donnée n'est jamais détruite, aucun déchet n'est laissé dans la base).
 */
return new class extends Migration
{
    private const TABLES_ANCIENNES = ['abonnements_paiements', 'abonnements', 'transactions', 'audit_log', 'factures', 'formules_tarifaires'];

    public function up(): void
    {
        if (DB::selectOne("SELECT 1 AS ok FROM pg_namespace WHERE nspname = 'finances'") === null) {
            throw new RuntimeException('Le schéma "finances" n\'existe pas : créez-le une fois avant de migrer (README).');
        }

        $this->retirerAncienneVersion();

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION finances.refuser_modification() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              RAISE EXCEPTION 'Table % en ajout seul : % interdit', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
            END $$;
        SQL);
    }

    private function retirerAncienneVersion(): void
    {
        $presentes = array_column(DB::select(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'finances' AND tablename = ANY (?)",
            ['{'.implode(',', self::TABLES_ANCIENNES).'}'],
        ), 'tablename');
        if ($presentes === []) {
            return;
        }
        foreach ($presentes as $table) {
            if (DB::selectOne("SELECT EXISTS (SELECT 1 FROM finances.\"{$table}\") AS rempli")->rempli) {
                throw new RuntimeException("La table finances.{$table} de l'ancienne version contient des données : migration arrêtée, rien n'a été modifié.");
            }
        }

        $liste = implode(', ', array_map(fn ($t) => "finances.\"{$t}\"", array_values(array_intersect(self::TABLES_ANCIENNES, $presentes))));
        DB::unprepared("DROP TABLE {$liste}");
        DB::table('migrations')->where('migration', 'like', '2025_01_01_00000%')->delete();
    }

    public function down(): void
    {
        DB::unprepared('DROP FUNCTION IF EXISTS finances.refuser_modification()');
    }
};
