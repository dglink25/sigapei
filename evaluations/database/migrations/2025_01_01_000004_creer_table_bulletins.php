<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.bulletins — instantané archivé à la clôture.
 * Guide suprême §00 règle 2 : calculé à la volée tant que la période est ouverte ;
 * instantané figé à la clôture, reconstructible à l'identique depuis notes.
 * Statuts : en_cours | clos | archive
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulletins', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('tenant_id');
            $table->string('apprenant_uuid');
            $table->string('periode');
            $table->string('annee_scolaire');
            $table->decimal('moyenne', 5, 2)->nullable();
            $table->unsignedInteger('rang')->nullable();
            $table->string('mention')->nullable();
            $table->string('statut')->default('en_cours');
            $table->string('pdf_document_uuid')->nullable(); // stocké dans schéma transverse documents
            $table->timestamps();

            $table->unique(['apprenant_uuid', 'periode', 'annee_scolaire']);
            $table->index(['tenant_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulletins');
    }
};
