<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Report des notes E-learning (devoirs, quiz) vers Évaluations.
 *  - evaluations.activite_elearning_uuid : devoir ou quiz d'origine. Une seule épreuve par activité
 *    et par tenant (index unique partiel) : un nouveau report de la même activité réutilise l'épreuve.
 *  - notes.source_elearning_uuid : soumission ou tentative à l'origine de la valeur actuelle (traçabilité).
 * Ajouts uniquement : aucune donnée existante n'est modifiée.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE evaluations ADD COLUMN activite_elearning_uuid uuid NULL');
        DB::statement('CREATE UNIQUE INDEX evaluations_activite_elearning_unique ON evaluations (tenant_id, activite_elearning_uuid) WHERE activite_elearning_uuid IS NOT NULL');
        DB::statement("ALTER TABLE evaluations ADD CONSTRAINT evaluations_elearning_chk CHECK (activite_elearning_uuid IS NULL OR type = 'note_elearning')");

        DB::statement('ALTER TABLE notes ADD COLUMN source_elearning_uuid uuid NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE notes DROP COLUMN IF EXISTS source_elearning_uuid');
        DB::statement('ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_elearning_chk');
        DB::statement('DROP INDEX IF EXISTS evaluations_activite_elearning_unique');
        DB::statement('ALTER TABLE evaluations DROP COLUMN IF EXISTS activite_elearning_uuid');
    }
};
