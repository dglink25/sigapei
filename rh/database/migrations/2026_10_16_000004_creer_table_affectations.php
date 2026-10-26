<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Affectations personnel ↔ matière ↔ classe (SOURCE DE VÉRITÉ de la règle 5).
 *
 * `matiere_uuid` (schéma `evaluations.matieres`) et `classe_uuid` (schéma
 * `scolarite.classes`) sont des UUID EXTERNES (règle 4) : aucune FK locale,
 * aucune copie de table. Un couple (matière, classe) ne peut porter qu'UNE
 * affectation active par année scolaire (index partiel) ; l'historique des
 * affectations terminées est conservé.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affectations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('personnel_id')->constrained('personnel')->restrictOnDelete();
            $table->uuid('matiere_uuid');   // evaluations.matieres (externe)
            $table->uuid('classe_uuid');    // scolarite.classes (externe)
            $table->string('annee_scolaire', 9); // ex. 2026-2027
            $table->unsignedSmallInteger('heures_semaine')->nullable();
            $table->date('date_debut')->nullable();
            $table->date('date_fin')->nullable();
            $table->string('statut', 20)->default('actif'); // actif, termine
            $table->timestamps();

            $table->index(['tenant_id', 'matiere_uuid', 'classe_uuid']);
            $table->index(['tenant_id', 'annee_scolaire', 'statut']);
        });

        DB::statement('ALTER TABLE affectations ADD CONSTRAINT affectations_dates_chk CHECK (date_fin IS NULL OR date_debut IS NULL OR date_fin >= date_debut)');
        // Une seule affectation ACTIVE par (membre, matière, classe, année) ; l'historique reste possible.
        DB::statement('CREATE UNIQUE INDEX affectations_active_unique ON affectations (tenant_id, personnel_id, matiere_uuid, classe_uuid, annee_scolaire) WHERE statut = \'actif\'');
    }

    public function down(): void
    {
        Schema::dropIfExists('affectations');
    }
};
