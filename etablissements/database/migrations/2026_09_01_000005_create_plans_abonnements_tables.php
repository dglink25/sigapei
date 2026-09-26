<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Plans, modules et abonnements (section 9 et 12.1) - reprise du mecanisme
 * deja specifie au niveau plateforme (section 30 du cahier des charges general).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('nom', 64);
            $table->decimal('prix', 12, 2);
            $table->enum('periodicite', ['mensuel', 'annuel']);
            $table->boolean('actif')->default(true);
            $table->unsignedInteger('jours_essai')->default(0);
            $table->timestamps();
        });

        Schema::create('plan_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->onDelete('cascade');
            $table->string('module', 64);
            $table->string('fonctionnalite', 128)->nullable();
            $table->boolean('inclus')->default(true);
            $table->timestamps();
        });

        Schema::create('etablissement_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->string('module', 64);
            $table->enum('statut', ['actif', 'inactif'])->default('actif');
            $table->timestamp('date_activation')->useCurrent();
            $table->timestamps();
            $table->unique(['etablissement_id', 'module']);
        });

        Schema::create('abonnements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('plan_id')->constrained('plans');
            $table->timestamp('date_debut')->useCurrent();
            $table->timestamp('date_fin')->nullable();
            $table->enum('statut', ['essai', 'actif', 'expire', 'resilie'])->default('essai');
            $table->timestamps();
        });

        Schema::create('abonnements_paiements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('abonnement_id')->constrained('abonnements')->onDelete('cascade');
            $table->decimal('montant', 12, 2);
            $table->enum('agregateur', ['fedapay', 'kkiapay']);
            $table->string('reference_externe', 128)->nullable();
            $table->enum('statut', ['en_attente', 'approuve', 'echoue', 'rembourse'])->default('en_attente');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('abonnements_paiements');
        Schema::dropIfExists('abonnements');
        Schema::dropIfExists('etablissement_modules');
        Schema::dropIfExists('plan_modules');
        Schema::dropIfExists('plans');
    }
};
