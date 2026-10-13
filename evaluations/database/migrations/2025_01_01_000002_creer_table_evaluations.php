<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.evaluations
 * CDC section 13.1 : évaluation ponctuelle rattachée à une matière et une classe.
 *
 * Types (CDC section 6.1) :
 *   devoir_surveille | composition | examen_officiel |
 *   evaluation_competence | composition_en_ligne | note_elearning
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('tenant_id');
            $table->string('classe_uuid');             // référence scolarite.classes
            $table->unsignedBigInteger('matiere_id');
            $table->string('type');
            $table->decimal('coefficient', 5, 2)->default(1);
            $table->date('date');
            $table->string('periode');                 // ex : trimestre_1
            $table->string('annee_scolaire');          // ex : 2025-2026
            $table->boolean('est_composition_en_ligne')->default(false);
            $table->string('quiz_elearning_uuid')->nullable();
            $table->unsignedTinyInteger('niveau_surveillance')->nullable(); // 1 | 2 | 3
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'classe_uuid', 'periode', 'annee_scolaire']);
            $table->foreign('matiere_id')->references('id')->on('matieres');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
