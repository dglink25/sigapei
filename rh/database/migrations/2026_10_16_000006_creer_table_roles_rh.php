<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rôles RH personnalisés d'un établissement (CDC RH §5.7 et §7.7).
 *
 * Le fondateur (profil administrateur de l'établissement) crée librement des rôles
 * (ex. « Chef de département ») ; les fonctions du module RH accordées à chaque rôle
 * vivent dans `role_rh_modules`. Un rôle n'est jamais supprimé physiquement : il est
 * archivé (`statut = archive`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles_rh', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->string('nom', 150);
            $table->text('description')->nullable();
            $table->string('statut', 20)->default('actif'); // actif, archive
            $table->timestamps();

            $table->unique(['tenant_id', 'nom']);
            $table->index(['tenant_id', 'statut']);
        });

        DB::statement("ALTER TABLE roles_rh ADD CONSTRAINT roles_rh_statut_chk CHECK (statut IN ('actif', 'archive'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('roles_rh');
    }
};
