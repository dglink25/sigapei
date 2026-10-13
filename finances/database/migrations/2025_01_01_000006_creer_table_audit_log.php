<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** CDC §9.2 : journal immuable de toutes les transactions et décisions. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->string('tenant_id')->nullable();
            $table->string('auteur_uuid');
            $table->string('type_action'); // transaction_confirmee|decaissement_valide|decaissement_rejete|rapport_exporte|hibernation_declenchee
            $table->string('entite_uuid')->nullable();
            $table->json('donnees')->nullable();
            $table->timestamp('horodatage')->useCurrent();

            $table->index(['tenant_id', 'type_action']);
            $table->index('horodatage');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_log');
    }
};
