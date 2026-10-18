<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 (compositions en ligne, bloquée par le contrat E-learning) — table créée pour figer le modèle.
 * Jamais de donnée biométrique (CDC §10.4) : type d'anomalie et horodatage uniquement. Journal immuable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surveillance_incident', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('evaluation_id')->constrained('evaluations')->restrictOnDelete();
            $table->uuid('apprenant_uuid');
            $table->string('type_anomalie', 30);
            $table->string('niveau_preuve', 20)->default('journal');
            $table->timestampTz('horodatage')->useCurrent();

            $table->index(['tenant_id', 'evaluation_id', 'apprenant_uuid']);
        });

        DB::statement("ALTER TABLE surveillance_incident ADD CONSTRAINT si_type_chk CHECK (type_anomalie IN ('perte_focus','changement_onglet','copier_coller','sortie_plein_ecran','deconnexion'))");
        DB::statement("ALTER TABLE surveillance_incident ADD CONSTRAINT si_preuve_chk CHECK (niveau_preuve IN ('journal','capture_periodique'))");
        DB::statement('CREATE TRIGGER surveillance_incident_immuable BEFORE UPDATE OR DELETE ON surveillance_incident FOR EACH ROW EXECUTE FUNCTION evaluations.refuser_modification()');
    }

    public function down(): void
    {
        Schema::dropIfExists('surveillance_incident');
    }
};
