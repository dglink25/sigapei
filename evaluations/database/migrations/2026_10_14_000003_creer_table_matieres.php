<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel des matières par établissement (CDC §13.1) + coefficients par cycle/niveau (CDC §5 :
 * "une même matière peut avoir un coefficient différent en 6e et en Terminale").
 * Une matière n'est jamais supprimée si des évaluations la référencent (désactivation).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matieres', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->string('code', 30);
            $table->string('nom', 150);
            $table->decimal('coefficient_defaut', 4, 2)->default(1);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'active']);
        });
        DB::statement('ALTER TABLE matieres ADD CONSTRAINT matieres_coef_chk CHECK (coefficient_defaut > 0)');

        Schema::create('coefficients_matiere', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('matiere_id')->constrained('matieres')->restrictOnDelete();
            $table->string('cycle', 20);
            $table->string('niveau', 50);          // valeur de scolarite.classes.niveau (6e, Tle, L1...)
            $table->decimal('coefficient', 4, 2);
            $table->timestamps();

            $table->unique(['matiere_id', 'cycle', 'niveau']);
            $table->index(['tenant_id', 'cycle', 'niveau']);
        });
        DB::statement('ALTER TABLE coefficients_matiere ADD CONSTRAINT cm_coef_chk CHECK (coefficient > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('coefficients_matiere');
        Schema::dropIfExists('matieres');
    }
};
