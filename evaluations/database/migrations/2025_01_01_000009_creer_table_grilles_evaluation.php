<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.grilles_evaluation — bibliothèque de grilles prédéfinies.
 * Guide requirements §6.1 + tasks §1.4 : "béninoise, française" au minimum.
 * Extensible par le super administrateur (DECISION-17).
 * tenant_id = null → grille système plateforme.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grilles_evaluation', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('code')->unique();       // ex : 'beninoise_secondaire'
            $table->string('nom');
            $table->string('cycle');                // primaire | secondaire | universitaire
            $table->decimal('note_max', 5, 2)->default(20);
            $table->decimal('note_min', 5, 2)->default(0);
            $table->boolean('avec_coefficients')->default(true);
            $table->boolean('avec_classement')->default(true);
            $table->json('echelle_appreciation')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('cycle');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grilles_evaluation');
    }
};
