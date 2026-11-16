<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** CDC §13.1 : frais de scolarité par classe/formule. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formules_tarifaires', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->string('tenant_id');
            $table->string('classe_uuid');           // référence scolarite.classes
            $table->decimal('montant', 12, 2);
            $table->string('periodicite')->default('annuel'); // annuel|semestriel|trimestriel|mensuel
            $table->string('libelle')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'classe_uuid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formules_tarifaires');
    }
};
