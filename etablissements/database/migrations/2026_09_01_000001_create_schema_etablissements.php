<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $schema = config('database.connections.pgsql.search_path', 'etablissements');
        DB::statement('CREATE SCHEMA IF NOT EXISTS "'.$schema.'"');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    }

    public function down(): void
    {
        // Le schema et les extensions ne sont pas supprimes (potentiellement partages).
    }
};
