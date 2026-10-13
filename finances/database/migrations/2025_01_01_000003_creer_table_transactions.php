<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CDC §3.2 : TABLE UNIQUE de tout flux financier, IMMUABLE après confirmation.
 * "Une transaction, une fois confirmée, n'est jamais modifiée ni supprimée."
 * Colonne sens : ENTRANT | SORTANT
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->string('tenant_id');
            $table->string('sens');                          // ENTRANT | SORTANT
            $table->unsignedBigInteger('facture_id')->nullable();
            $table->decimal('montant', 12, 2);
            $table->string('moyen_paiement');                // fedapay|kkiapay|virement_bancaire|especes|api_operateur
            $table->string('destinataire_uuid')->nullable();
            $table->string('statut')->default('en_attente'); // en_attente|confirme|echoue|annule
            $table->string('initiateur_uuid');
            $table->string('validateur_uuid')->nullable();   // obligatoire pour SORTANT (séparation des tâches)
            $table->string('reference_externe')->nullable()->unique(); // idempotence webhook CDC §7.1
            $table->timestamp('date')->useCurrent();
            $table->timestamp('created_at')->useCurrent();
            // Pas de updated_at : table immuable

            $table->index(['tenant_id', 'sens', 'statut']);
            $table->index(['tenant_id', 'date']);
            $table->foreign('facture_id')->references('id')->on('factures')->nullOnDelete();
        });
    }

    public function down(): void { Schema::dropIfExists('transactions'); }
};
