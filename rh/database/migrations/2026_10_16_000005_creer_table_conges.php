<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes de congé du personnel (CDC RH). Cycle de vie explicite, aucune
 * suppression physique : une demande reste traçable (statut `annulee` le cas
 * échéant). Le nombre de jours est stocké tel que calculé côté service.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conges', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('personnel_id')->constrained('personnel')->restrictOnDelete();
            $table->string('type_conge', 30); // annuel, maladie, maternite, exceptionnel...
            $table->date('date_debut');
            $table->date('date_fin');
            $table->unsignedSmallInteger('jours');
            $table->text('motif')->nullable();
            $table->string('statut', 20)->default('en_attente'); // en_attente, approuvee, refusee, annulee
            $table->uuid('demandeur_uuid')->nullable();          // auteur de la demande (Identité)
            $table->uuid('traitee_par_uuid')->nullable();        // valideur (Identité)
            $table->text('commentaire_traitement')->nullable();
            $table->timestamp('traitee_le')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'personnel_id']);
            $table->index(['tenant_id', 'statut']);
        });

        DB::statement('ALTER TABLE conges ADD CONSTRAINT conges_dates_chk CHECK (date_fin >= date_debut)');
        DB::statement('ALTER TABLE conges ADD CONSTRAINT conges_jours_chk CHECK (jours > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('conges');
    }
};
