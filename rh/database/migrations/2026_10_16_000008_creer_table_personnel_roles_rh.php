<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Attribution d'un rôle RH à un membre du personnel (CDC RH §5.7 et §7.9).
 *
 * Table de liaison many-to-many : un même membre du personnel peut cumuler plusieurs
 * rôles RH (ex. enseignant et chef de département). Le retrait d'un rôle supprime la
 * ligne d'attribution (lien), jamais le personnel ni le rôle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personnel_roles_rh', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personnel_id')->constrained('personnel')->cascadeOnDelete();
            $table->foreignId('role_rh_id')->constrained('roles_rh')->cascadeOnDelete();
            $table->date('date_attribution');
            $table->timestamps();

            $table->unique(['personnel_id', 'role_rh_id']);
            $table->index(['role_rh_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel_roles_rh');
    }
};
