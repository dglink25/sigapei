<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;


return new class extends Migration{

    public function up(): void  {
        // --- pays ---
        DB::statement('ALTER TABLE pays ADD COLUMN IF NOT EXISTS code_iso3 char(3)');
        DB::statement('ALTER TABLE pays ADD COLUMN IF NOT EXISTS continent varchar(32)');
        DB::statement("ALTER TABLE pays ADD COLUMN IF NOT EXISTS libelle_niveau_1 varchar(64) NOT NULL DEFAULT 'Département / Région'");
        DB::statement("ALTER TABLE pays ADD COLUMN IF NOT EXISTS libelle_niveau_2 varchar(64) NOT NULL DEFAULT 'Commune / Ville'");
        DB::statement("ALTER TABLE pays ADD COLUMN IF NOT EXISTS libelle_niveau_3 varchar(64) NOT NULL DEFAULT 'Arrondissement / Quartier'");
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS pays_code_iso3_unique ON pays (code_iso3)');
        DB::statement('CREATE INDEX IF NOT EXISTS pays_continent_index ON pays (continent)');

        // --- subdivisions : identifiant d'origine pour des imports idempotents ---
        foreach (['departements', 'communes', 'arrondissements'] as $table) {
            DB::statement("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS source varchar(32)");
            DB::statement("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS code_externe varchar(64)");
            DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS {$table}_source_code_externe_unique ON {$table} (source, code_externe)");
        }

        // --- index sur les cles etrangeres (PostgreSQL n'en cree pas automatiquement) ---
        DB::statement('CREATE INDEX IF NOT EXISTS departements_pays_id_index ON departements (pays_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS communes_departement_id_index ON communes (departement_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS arrondissements_commune_id_index ON arrondissements (commune_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS arrondissements_commune_id_index');
        DB::statement('DROP INDEX IF EXISTS communes_departement_id_index');
        DB::statement('DROP INDEX IF EXISTS departements_pays_id_index');

        foreach (['departements', 'communes', 'arrondissements'] as $table) {
            DB::statement("DROP INDEX IF EXISTS {$table}_source_code_externe_unique");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS code_externe");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS source");
        }

        DB::statement('DROP INDEX IF EXISTS pays_continent_index');
        DB::statement('DROP INDEX IF EXISTS pays_code_iso3_unique');
        DB::statement('ALTER TABLE pays DROP COLUMN IF EXISTS libelle_niveau_3');
        DB::statement('ALTER TABLE pays DROP COLUMN IF EXISTS libelle_niveau_2');
        DB::statement('ALTER TABLE pays DROP COLUMN IF EXISTS libelle_niveau_1');
        DB::statement('ALTER TABLE pays DROP COLUMN IF EXISTS continent');
        DB::statement('ALTER TABLE pays DROP COLUMN IF EXISTS code_iso3');
    }
};
