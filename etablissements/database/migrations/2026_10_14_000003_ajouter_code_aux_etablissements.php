<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public function up(): void   {
        DB::statement('ALTER TABLE etablissements ADD COLUMN IF NOT EXISTS code varchar(4)');

        // Remplissage des lignes existantes (generateur volontairement local :
        // une migration ne doit pas dependre d'une classe applicative qui evoluera).
        $utilises = DB::table('etablissements')->whereNotNull('code')->pluck('code')->flip()->all();

        foreach (DB::table('etablissements')->whereNull('code')->orderBy('id')->pluck('id') as $id) {
            do {
                $code = '';
                for ($i = 0; $i < 4; $i++) {
                    $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
                }
            } while (isset($utilises[$code]));

            $utilises[$code] = true;
            DB::table('etablissements')->where('id', $id)->update(['code' => $code]);
        }

        DB::statement('ALTER TABLE etablissements ALTER COLUMN code SET NOT NULL');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS etablissements_code_unique ON etablissements (code)');

        // Garantie au niveau de la base : le format XXXX ne peut pas etre contourne.
        DB::unprepared(<<<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'etablissements_code_format') THEN
        ALTER TABLE etablissements ADD CONSTRAINT etablissements_code_format CHECK (code ~ '^[A-Z0-9]{4}$');
    END IF;
END
$$;
SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE etablissements DROP CONSTRAINT IF EXISTS etablissements_code_format');
        DB::statement('DROP INDEX IF EXISTS etablissements_code_unique');
        DB::statement('ALTER TABLE etablissements DROP COLUMN IF EXISTS code');
    }
};
