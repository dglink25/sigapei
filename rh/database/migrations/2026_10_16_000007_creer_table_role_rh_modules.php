<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fonctions du module RH accordées (ou non) à un rôle RH (CDC RH §5.7 et §7.8).
 *
 * Une ligne par fonction ; `inclus` active ou désactive la fonction pour le rôle.
 * Le contrôle d'accès du module croise `personnel_roles_rh` et cette table pour
 * déterminer les fonctions accessibles à un utilisateur donné.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_rh_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_rh_id')->constrained('roles_rh')->cascadeOnDelete();
            $table->string('fonction', 40);
            $table->boolean('inclus')->default(true);
            $table->timestamps();

            $table->unique(['role_rh_id', 'fonction']);
        });

        $fonctions = "'dossiers', 'affectations', 'charges_horaires', 'conges', 'evaluations', 'contrats_intervenants'";
        DB::statement("ALTER TABLE role_rh_modules ADD CONSTRAINT role_rh_modules_fonction_chk CHECK (fonction IN ({$fonctions}))");
    }

    public function down(): void
    {
        Schema::dropIfExists('role_rh_modules');
    }
};
