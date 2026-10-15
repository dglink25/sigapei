<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Vérifie le prérequis : le schéma `finances` doit exister avant la première migration
 * (README). Aucun CREATE SCHEMA ici : sur la base partagée, le rôle applicatif n'a pas
 * forcément le droit CREATE sur la base, et l'instruction échoue même si le schéma existe.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::selectOne("SELECT 1 AS ok FROM pg_namespace WHERE nspname = 'finances'") === null) {
            throw new RuntimeException('Le schéma "finances" n\'existe pas : créez-le une fois avant de migrer (README).');
        }
    }

    public function down(): void
    {
        // Rien : le schéma n'est jamais supprimé par une migration.
    }
};
