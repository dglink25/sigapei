<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Contrats de travail (CDC RH). Un contrat référence un membre du personnel et,
 * éventuellement, un grade. La règle « un seul contrat actif à la fois » est
 * appliquée par l'index partiel unique ci-dessous (défense en profondeur :
 * PostgreSQL refuse deux contrats actifs pour le même membre).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrats', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('personnel_id')->constrained('personnel')->restrictOnDelete();
            $table->foreignId('grade_id')->nullable()->constrained('grades')->restrictOnDelete();
            $table->string('type_contrat', 30);      // cdi, cdd, vacataire, stage, fonctionnaire...
            $table->string('reference', 60)->nullable();
            $table->date('date_debut');
            $table->date('date_fin')->nullable();
            $table->unsignedSmallInteger('quotite')->default(100); // pourcentage (temps partiel)
            $table->decimal('salaire_base', 12, 2)->nullable();
            $table->string('devise', 3)->default('XOF');
            $table->boolean('est_actif')->default(true);
            $table->string('statut', 20)->default('actif'); // actif, termine, resilie, suspendu
            $table->timestamps();

            $table->index(['tenant_id', 'personnel_id']);
            $table->index(['tenant_id', 'statut']);
        });

        DB::statement('ALTER TABLE contrats ADD CONSTRAINT contrats_dates_chk CHECK (date_fin IS NULL OR date_fin >= date_debut)');
        DB::statement('ALTER TABLE contrats ADD CONSTRAINT contrats_quotite_chk CHECK (quotite > 0 AND quotite <= 100)');
        // Un seul contrat actif sans date de fin par membre et par tenant.
        DB::statement('CREATE UNIQUE INDEX contrats_actif_unique ON contrats (tenant_id, personnel_id) WHERE est_actif AND date_fin IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('contrats');
    }
};
