<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.matieres
 * CDC section 13.1 : référentiel des matières par établissement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matieres', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('tenant_id');
            $table->string('nom');
            $table->decimal('coefficient_defaut', 5, 2)->default(1);
            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'nom']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matieres');
    }
};
