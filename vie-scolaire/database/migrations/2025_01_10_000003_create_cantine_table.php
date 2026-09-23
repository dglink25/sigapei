<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table vie_scolaire.cantine — V2+, HORS LOT (section 2.4 / 7.1 / 9 du CDC).
 *
 * Posee des ce lot pour eviter une migration disruptive lors de
 * l'activation de la V2, mais non accessible par endpoint dans ce lot.
 *
 * Choix de modelisation de ce document : table separee de "transport"
 * plutot qu'une table combinee (point ouvert, a confirmer avec l'equipe
 * — voir conclusion du CDC microservice).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cantine', function (Blueprint $table) {
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
        Schema::dropIfExists('cantine');
    }
};
