<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Barèmes (CDC §4.2) : bibliothèque de grilles prédéfinies, extensible.
 * tenant_id NULL = grille plateforme (super administrateur) ; sinon grille propre à un établissement.
 * type_notation : chiffree (note sur N) | competences (niveaux, sans moyenne chiffrée).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grilles_evaluation', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('code', 60);
            $table->string('nom', 150);
            $table->string('cycle', 20);
            $table->string('programme', 20);
            $table->string('type_notation', 20)->default('chiffree');
            $table->decimal('note_min', 5, 2)->default(0);
            $table->decimal('note_max', 5, 2)->default(20);
            $table->boolean('avec_coefficients')->default(true);
            $table->boolean('avec_classement')->default(true);
            // Niveaux de compétence (grille "competences") : [{"code":"A","libelle":"Acquis"}, ...]
            $table->jsonb('niveaux_competence')->nullable();
            $table->text('description')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'cycle']);
        });

        DB::statement("ALTER TABLE grilles_evaluation ADD CONSTRAINT grilles_cycle_chk CHECK (cycle IN ('primaire','secondaire','universitaire'))");
        DB::statement("ALTER TABLE grilles_evaluation ADD CONSTRAINT grilles_programme_chk CHECK (programme IN ('beninois','francais','autre'))");
        DB::statement("ALTER TABLE grilles_evaluation ADD CONSTRAINT grilles_type_chk CHECK (type_notation IN ('chiffree','competences'))");
        DB::statement('ALTER TABLE grilles_evaluation ADD CONSTRAINT grilles_bornes_chk CHECK (note_min >= 0 AND note_max > note_min)');
        // Un code unique par établissement, et un code unique parmi les grilles plateforme.
        DB::statement('CREATE UNIQUE INDEX grilles_code_tenant_uq ON grilles_evaluation (tenant_id, code) WHERE tenant_id IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX grilles_code_plateforme_uq ON grilles_evaluation (code) WHERE tenant_id IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('grilles_evaluation');
    }
};
