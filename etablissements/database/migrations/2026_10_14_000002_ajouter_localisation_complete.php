<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;


return new class extends Migration {
    public function up(): void   {
        foreach (['etablissements', 'demandes_etablissement'] as $table) {
            DB::statement("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS pays_id bigint REFERENCES pays(id)");
            DB::statement("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS departement_id bigint REFERENCES departements(id)");
            DB::statement("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS commune_id bigint REFERENCES communes(id)");

            // Completion des lignes existantes, de l'arrondissement vers le pays.
            DB::statement("UPDATE {$table} t SET commune_id = a.commune_id FROM arrondissements a WHERE t.arrondissement_id = a.id AND t.commune_id IS NULL");
            DB::statement("UPDATE {$table} t SET departement_id = c.departement_id FROM communes c WHERE t.commune_id = c.id AND t.departement_id IS NULL");
            DB::statement("UPDATE {$table} t SET pays_id = d.pays_id FROM departements d WHERE t.departement_id = d.id AND t.pays_id IS NULL");

            DB::statement("CREATE INDEX IF NOT EXISTS {$table}_pays_id_index ON {$table} (pays_id)");
            DB::statement("CREATE INDEX IF NOT EXISTS {$table}_departement_id_index ON {$table} (departement_id)");
            DB::statement("CREATE INDEX IF NOT EXISTS {$table}_commune_id_index ON {$table} (commune_id)");
        }

        // L'arrondissement n'existe pas dans tous les pays : il devient facultatif.
        DB::statement('ALTER TABLE etablissements ALTER COLUMN arrondissement_id DROP NOT NULL');
    }

    public function down(): void
    {
        foreach (['etablissements', 'demandes_etablissement'] as $table) {
            DB::statement("DROP INDEX IF EXISTS {$table}_commune_id_index");
            DB::statement("DROP INDEX IF EXISTS {$table}_departement_id_index");
            DB::statement("DROP INDEX IF EXISTS {$table}_pays_id_index");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS commune_id");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS departement_id");
            DB::statement("ALTER TABLE {$table} DROP COLUMN IF EXISTS pays_id");
        }

        // Le NOT NULL de etablissements.arrondissement_id n'est volontairement pas
        // retabli : des lignes sans arrondissement peuvent exister (rendre la colonne
        // obligatoire a nouveau echouerait).
    }
};
