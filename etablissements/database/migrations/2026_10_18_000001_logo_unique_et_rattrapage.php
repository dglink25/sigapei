<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Logo : une demande n'a qu'un seul logo, et chaque etablissement existant
 * est rattache au logo de sa demande d'origine.
 *
 * Le caractere obligatoire du logo n'est pas une contrainte de schema (le
 * brouillon existe avant l'upload) : il est applique par OnboardingService::soumettre().
 */
return new class extends Migration {
    public function up(): void
    {
        // 1. Doublons eventuels : on garde le logo le plus recent de chaque demande.
        //    Les fichiers des lignes supprimees restent orphelins sur le stockage (a purger a part).
        DB::statement(<<<'SQL'
DELETE FROM documents_etablissement d
USING documents_etablissement plus_recent
WHERE d.type = 'logo'
  AND plus_recent.type = 'logo'
  AND d.demande_id = plus_recent.demande_id
  AND d.id < plus_recent.id
SQL);

        // 2. Un seul logo par demande, garanti par la base.
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS documents_etablissement_logo_unique ON documents_etablissement (demande_id) WHERE type = 'logo'");

        // 3. Rattrapage : etablissements sans logo_document_id mais dont la demande a un logo.
        DB::statement(<<<'SQL'
UPDATE etablissements e
SET logo_document_id = d.uuid::text
FROM demandes_etablissement dm
JOIN documents_etablissement d ON d.demande_id = dm.id AND d.type = 'logo'
WHERE dm.etablissement_id = e.id
  AND e.logo_document_id IS NULL
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS documents_etablissement_logo_unique');
        // Le rattrapage de logo_document_id et la suppression des doublons ne sont pas annules.
    }
};
