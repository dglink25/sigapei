<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Journal IMMUABLE de toute modification d'une note existante (CDC §9, §16).
 * UPDATE et DELETE refusés par trigger : ni le code ni un accès SQL manuel ne peuvent réécrire l'historique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_note', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('note_id')->constrained('notes')->restrictOnDelete();
            $table->uuid('auteur_uuid');
            $table->string('auteur_role', 20);
            $table->string('statut_avant', 20);
            $table->decimal('valeur_avant', 5, 2)->nullable();
            $table->string('statut_apres', 20);
            $table->decimal('valeur_apres', 5, 2)->nullable();
            $table->text('motif');
            $table->boolean('apres_cloture')->default(false);
            $table->timestampTz('cree_le')->useCurrent();

            $table->index(['tenant_id', 'note_id']);
        });

        DB::statement('ALTER TABLE audit_note ADD CONSTRAINT audit_motif_chk CHECK (char_length(btrim(motif)) >= 10)');
        DB::statement('CREATE TRIGGER audit_note_immuable BEFORE UPDATE OR DELETE ON audit_note FOR EACH ROW EXECUTE FUNCTION evaluations.refuser_modification()');
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_note');
    }
};
