<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Périodes d'évaluation (CDC §6.2) : trimestre ou semestre, par établissement, année et cycle.
 * Borne la fenêtre de saisie ; la clôture fige les bulletins (POST /periodes/{uuid}/cloturer).
 * statut : ouverte -> en_cloture (calcul en cours) -> cloturee.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periodes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->string('annee_scolaire', 9);   // 2026-2027
            $table->string('cycle', 20);
            $table->string('type', 10);            // trimestre | semestre
            $table->unsignedSmallInteger('numero');
            $table->string('libelle', 60);
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('statut', 12)->default('ouverte');
            $table->uuid('cloturee_par_uuid')->nullable();
            $table->timestampTz('cloturee_le')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'annee_scolaire', 'cycle', 'type', 'numero']);
            $table->index(['tenant_id', 'statut']);
        });

        DB::statement("ALTER TABLE periodes ADD CONSTRAINT periodes_annee_chk CHECK (annee_scolaire ~ '^[0-9]{4}-[0-9]{4}$')");
        DB::statement("ALTER TABLE periodes ADD CONSTRAINT periodes_cycle_chk CHECK (cycle IN ('primaire','secondaire','universitaire'))");
        DB::statement("ALTER TABLE periodes ADD CONSTRAINT periodes_type_chk CHECK (type IN ('trimestre','semestre'))");
        DB::statement('ALTER TABLE periodes ADD CONSTRAINT periodes_numero_chk CHECK (numero BETWEEN 1 AND 3)');
        DB::statement('ALTER TABLE periodes ADD CONSTRAINT periodes_dates_chk CHECK (date_fin > date_debut)');
        DB::statement("ALTER TABLE periodes ADD CONSTRAINT periodes_statut_chk CHECK (statut IN ('ouverte','en_cloture','cloturee'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('periodes');
    }
};
