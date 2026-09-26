<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Referentiel geographique panafricain hierarchique (section 5) :
 * pays -> departements (regions) -> communes -> arrondissements (districts).
 * Charge en base au demarrage via PaysAfriqueSeeder, modifiable uniquement
 * par le Super Administrateur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pays', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));
            $table->char('code_iso', 2)->unique();
            $table->string('nom', 128);
            $table->string('indicatif_tel', 8);
            $table->timestamps();
        });

        Schema::create('departements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignId('pays_id')->constrained('pays')->onDelete('cascade');
            $table->string('nom', 128);
            $table->timestamps();
        });

        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignId('departement_id')->constrained('departements')->onDelete('cascade');
            $table->string('nom', 128);
            $table->timestamps();
        });

        Schema::create('arrondissements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignId('commune_id')->constrained('communes')->onDelete('cascade');
            $table->string('nom', 128);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arrondissements');
        Schema::dropIfExists('communes');
        Schema::dropIfExists('departements');
        Schema::dropIfExists('pays');
    }
};
