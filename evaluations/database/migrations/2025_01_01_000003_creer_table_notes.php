<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.notes — source unique de tout calcul.
 * Guide suprême §00 règle 2 : "Une note n'existe qu'à un seul endroit."
 * Contrainte UNIQUE sur (apprenant_uuid, evaluation_id) : une note par apprenant/éval.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('tenant_id');
            $table->string('apprenant_uuid');       // référence scolarite.apprenants
            $table->unsignedBigInteger('evaluation_id');
            $table->decimal('valeur', 5, 2);
            $table->string('saisi_par_uuid');       // référence identite.utilisateurs
            $table->timestamp('date_saisie');
            $table->timestamps();

            $table->unique(['apprenant_uuid', 'evaluation_id']);
            $table->index(['tenant_id', 'apprenant_uuid']);
            $table->foreign('evaluation_id')->references('id')->on('evaluations');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
