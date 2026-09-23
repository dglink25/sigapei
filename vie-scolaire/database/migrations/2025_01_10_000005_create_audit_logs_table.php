<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table vie_scolaire.audit_logs — section 10 du CDC.
 *
 * Journalise de facon inalterable les corrections de presence, les
 * incidents disciplinaires et les sanctions. Chaque entree porte tenant_id,
 * est horodatee (timestamps) et ne peut etre modifiee apres creation :
 * on ne fait jamais de UPDATE sur cette table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->unsignedBigInteger('tenant_id');
            $table->string('acteur_id')->nullable()->comment('uuid utilisateur, claim sub');

            $table->string('action');
            $table->string('entite');
            $table->uuid('entite_uuid');

            $table->json('avant')->nullable();
            $table->json('apres')->nullable();
            $table->text('motif')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'entite']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
