<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table vie_scolaire.transport — V2+, HORS LOT (section 2.4 / 7.1 / 9 du CDC).
 * Structure identique a "cantine", voir cette migration pour le contexte.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transport', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('apprenant_id');

            $table->string('formule')->nullable();
            $table->enum('statut_paiement', ['a_jour', 'en_retard', 'suspendu'])->default('a_jour');

            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'apprenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport');
    }
};
