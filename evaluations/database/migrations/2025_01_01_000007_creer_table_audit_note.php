<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.audit_note — table IMMUABLE (guide DECISION-02).
 * Guide suprême §04 §5 + requirements §12 :
 * aucune UPDATE ni DELETE applicatif sur cette table.
 * Tracée : note_id, auteur, valeur avant/après, motif, date.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_note', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('note_id');
            $table->string('auteur_uuid');
            $table->decimal('valeur_avant', 5, 2);
            $table->decimal('valeur_apres', 5, 2);
            $table->text('motif');
            $table->timestamp('date')->useCurrent();
            // Pas de updated_at : table immuable

            $table->index('note_id');
            $table->foreign('note_id')->references('id')->on('notes');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_note');
    }
};
