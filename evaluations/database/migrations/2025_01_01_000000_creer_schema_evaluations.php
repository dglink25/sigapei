<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Crée le schéma PostgreSQL "evaluations".
 * À exécuter en premier — CDC Regle n°1.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS evaluations');
    }

    public function down(): void
    {
        // Ne pas supprimer en production.
    }
};
