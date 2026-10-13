<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.modele_bulletin
 * Guide suprême design §1 : un modèle par tenant_id + cycle.
 * Cycle : primaire | secondaire | universitaire
 * arrondi : demi | entier | deux_decimales (DECISION-13 pour valeurs exactes)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modele_bulletin', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('tenant_id');
            $table->string('cycle');
            $table->json('en_tete')->nullable();
            $table->json('colonnes_affichees')->nullable();
            $table->json('echelle_appreciation')->nullable();
            $table->string('arrondi')->default('demi');
            $table->text('mentions_bas_de_page')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'cycle']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modele_bulletin');
    }
};
