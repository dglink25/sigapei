<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel des grades / corps d'un établissement (CDC RH, paramétrage).
 * Un grade est un référentiel propre au tenant ; il n'est jamais supprimé s'il
 * est référencé par un contrat (désactivation via `active`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->string('code', 30);
            $table->string('libelle', 150);
            $table->string('categorie', 50)->nullable();     // A, B, C... ou intitulé local
            $table->unsignedSmallInteger('echelon_min')->default(1);
            $table->unsignedSmallInteger('echelon_max')->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'active']);
        });

        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_echelon_chk CHECK (echelon_max >= echelon_min)');
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
