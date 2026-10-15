<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Une évaluation ponctuelle rattachée à une matière, une classe et une période (CDC §6.1, §13.1).
 *  - note_sur : barème propre à l'épreuve (devoir sur 10, sur 40...) ; ramené sur la grille au calcul
 *  - rattrapage_de_id : évaluation de rattrapage d'une autre (CDC §5, règle paramétrable)
 *  - saisie_cloturee_le : l'enseignant a verrouillé ses notes (CDC §8.1)
 * classe_uuid / enseignant_uuid : références vers Scolarité / Identité (jamais de FK inter-schémas).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('periode_id')->constrained('periodes')->restrictOnDelete();
            $table->foreignId('matiere_id')->constrained('matieres')->restrictOnDelete();
            $table->uuid('classe_uuid');
            $table->uuid('enseignant_uuid');
            $table->string('type', 30);
            $table->string('libelle', 150);
            $table->date('date_evaluation');
            $table->decimal('coefficient', 4, 2)->default(1);
            $table->decimal('note_sur', 5, 2)->default(20);
            $table->foreignId('rattrapage_de_id')->nullable()->constrained('evaluations')->restrictOnDelete();
            $table->boolean('est_composition_en_ligne')->default(false);
            $table->uuid('quiz_elearning_uuid')->nullable();
            $table->unsignedSmallInteger('niveau_surveillance')->nullable();
            $table->timestampTz('saisie_cloturee_le')->nullable();
            $table->uuid('cree_par_uuid');
            $table->timestamps();

            $table->index(['tenant_id', 'classe_uuid', 'periode_id']);
            $table->index(['tenant_id', 'enseignant_uuid']);
        });

        DB::statement("ALTER TABLE evaluations ADD CONSTRAINT evaluations_type_chk CHECK (type IN ('devoir_surveille','interrogation','composition','examen_officiel','evaluation_competence','composition_en_ligne','note_elearning'))");
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_coef_chk CHECK (coefficient > 0)');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_note_sur_chk CHECK (note_sur > 0)');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_surveillance_chk CHECK (niveau_surveillance IS NULL OR niveau_surveillance BETWEEN 1 AND 3)');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_ligne_chk CHECK (est_composition_en_ligne = (quiz_elearning_uuid IS NOT NULL))');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_rattrapage_chk CHECK (rattrapage_de_id IS NULL OR rattrapage_de_id <> id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
