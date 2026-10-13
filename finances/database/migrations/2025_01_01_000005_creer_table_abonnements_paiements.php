<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** CDC §13.1 : règlements de l'abonnement, confirmés par webhook (idempotence). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('abonnements_paiements', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('abonnement_id');
            $table->decimal('montant', 12, 2);
            $table->string('agregateur');              // fedapay | kkiapay
            $table->string('reference_externe')->unique(); // idempotence CDC §7.1
            $table->string('statut')->default('en_attente'); // en_attente|confirme|echoue
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('abonnement_id')->references('id')->on('abonnements');
        });
    }

    public function down(): void { Schema::dropIfExists('abonnements_paiements'); }
};
