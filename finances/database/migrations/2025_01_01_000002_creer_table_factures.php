<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** CDC §13.1 : facturation des frais dus par l'apprenant. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factures', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->string('tenant_id');
            $table->string('apprenant_uuid');
            $table->unsignedBigInteger('formule_tarifaire_id')->nullable();
            $table->decimal('montant', 12, 2);
            $table->decimal('montant_paye', 12, 2)->default(0);
            $table->string('statut')->default('en_attente'); // en_attente|partiellement_payee|payee|annulee
            $table->date('echeance');
            $table->string('annee_scolaire');
            $table->timestamps();

            $table->index(['tenant_id', 'apprenant_uuid', 'statut']);
            $table->index(['tenant_id', 'echeance', 'statut']);
            $table->foreign('formule_tarifaire_id')->references('id')->on('formules_tarifaires')->nullOnDelete();
        });
    }

    public function down(): void { Schema::dropIfExists('factures'); }
};
