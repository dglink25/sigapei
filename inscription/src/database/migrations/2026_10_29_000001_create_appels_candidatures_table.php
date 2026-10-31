<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS inscription');

        Schema::create('inscription.appels_candidatures', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('annee_scolaire', 20)->nullable();
            $table->string('cycle', 50); // maternelle, primaire, secondaire, universitaire

            // 1. Maternelle & Primaire
            $table->unsignedBigInteger('groupe_id')->nullable();
            $table->string('groupe_nom', 100)->nullable();
            $table->boolean('est_cycle_unique')->default(false);

            // 2. Secondaire
            $table->string('promotion_nom', 100)->nullable();
            $table->string('promotion_abreviation', 50)->nullable();
            $table->string('serie_nom', 100)->nullable();
            $table->string('serie_code', 50)->nullable();

            // 3. Universitaire (Cycle -> Département -> Option -> Niveau)
            $table->string('cycle_univ', 50)->nullable(); // licence, licence_pro, master, doctorat
            $table->string('departement_nom', 100)->nullable();
            $table->string('option_nom', 100)->nullable();
            $table->string('niveau_etude', 100)->nullable(); // L1, L2, M1...
            $table->string('filiere_complete', 255)->nullable(); // "Département GE / Option Électronique"

            // Métadonnées & Période
            $table->string('titre', 255);
            $table->text('description')->nullable();
            $table->dateTime('date_debut');
            $table->dateTime('date_fin');

            // Frais & Paiement
            $table->boolean('est_payant')->default(false);
            $table->decimal('montant', 12, 2)->default(0);
            $table->string('devise', 10)->default('XOF');

            // Configuration dynamique JSON
            $table->jsonb('criteres_eligibilite')->default('[]');
            $table->jsonb('pieces_fournir')->default('[]');

            // Statut
            $table->string('statut', 30)->default('ouvert'); // brouillon, ouvert, ferme, termine, annule
            $table->unsignedInteger('places_disponibles')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'cycle']);
            $table->index(['tenant_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscription.appels_candidatures');
    }
};
