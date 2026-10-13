<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CDC §4.1 : trois états — actif | grace | hibernation
 * Finances détecte l'impayé, Établissements applique le blocage (RabbitMQ).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('abonnements', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->string('tenant_id')->unique();
            $table->string('plan_uuid')->nullable();
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('statut')->default('actif'); // actif | grace | hibernation
            $table->timestamps();

            $table->index(['statut', 'date_fin']);
        });
    }

    public function down(): void { Schema::dropIfExists('abonnements'); }
};
