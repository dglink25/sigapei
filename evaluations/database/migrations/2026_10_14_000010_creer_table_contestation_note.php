<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Contestation d'une note par un parent ou un apprenant (CDC §9).
 * statut : ouverte -> en_examen -> resolue | rejetee ; escaladée à l'administrateur après le délai paramétré.
 * Une seule contestation active par note et par demandeur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contestation_note', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('note_id')->constrained('notes')->restrictOnDelete();
            $table->uuid('demandeur_uuid');
            $table->string('demandeur_role', 20);
            $table->string('statut', 12)->default('ouverte');
            $table->text('motif');
            $table->text('reponse')->nullable();
            $table->uuid('traitee_par_uuid')->nullable();
            $table->timestampTz('ouverte_le')->useCurrent();
            $table->timestampTz('escaladee_le')->nullable();
            $table->timestampTz('cloturee_le')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'statut']);
        });

        DB::statement("ALTER TABLE contestation_note ADD CONSTRAINT cn_statut_chk CHECK (statut IN ('ouverte','en_examen','resolue','rejetee'))");
        DB::statement("ALTER TABLE contestation_note ADD CONSTRAINT cn_role_chk CHECK (demandeur_role IN ('apprenant','parent'))");
        DB::statement('ALTER TABLE contestation_note ADD CONSTRAINT cn_motif_chk CHECK (char_length(btrim(motif)) BETWEEN 10 AND 2000)');
        DB::statement("CREATE UNIQUE INDEX cn_active_uq ON contestation_note (note_id, demandeur_uuid) WHERE statut IN ('ouverte','en_examen')");
    }

    public function down(): void
    {
        Schema::dropIfExists('contestation_note');
    }
};
