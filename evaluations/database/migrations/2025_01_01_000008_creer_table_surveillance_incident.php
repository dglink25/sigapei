<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.surveillance_incident — phase 2 (compositions en ligne).
 * Guide suprême §04 §4 : jamais de donnée biométrique.
 * Créée maintenant dans les migrations même si la fonctionnalité est phase 2
 * (guide design §1 note : DECISION-06 confirmée).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surveillance_incident', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('evaluation_id');
            $table->string('apprenant_uuid');
            // type_anomalie : perte_focus | changement_onglet | copier_coller | plein_ecran (DECISION-11)
            $table->string('type_anomalie');
            $table->timestamp('horodatage')->useCurrent();
            // niveau_preuve : description textuelle uniquement, jamais biométrique
            $table->text('niveau_preuve')->nullable();
            // Pas de updated_at : journal d'incidents, immuable

            $table->index(['evaluation_id', 'apprenant_uuid']);
            $table->foreign('evaluation_id')->references('id')->on('evaluations');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surveillance_incident');
    }
};
