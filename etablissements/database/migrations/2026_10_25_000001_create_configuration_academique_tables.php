<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration académique d'un établissement (section "Refonte configuration").
 *
 * Toute l'organisation pédagogique locale est stockée ici, rattachée à
 * un établissement (tenant = etablissement_id) et, selon l'entité, à une
 * année académique précise.
 *
 * Règle de suppression : aucune suppression physique pour les années
 * académiques et les configurations liées ; archivage ou désactivation
 * uniquement (colonne `actif` ou `suspendu`).
 *
 * Tables créées :
 *   annees_academiques
 *   cycles_config              (cycles actifs pour une année - complète cycles_autorises)
 *   subdivisions_pedagogiques  (groupes / sections / départements)
 *   niveaux_scolaires          (référentiel niveaux du tenant par cycle)
 *   series_filieres            (séries secondaire / filières univ)
 *   classes_config             (instances concrètes niveau × subdivision × série)
 *   cohortes_universitaires    (filière × niveau × lettre de cohorte)
 *   matieres_config            (matière externe + coeff dans un contexte pédagogique)
 *   audit_config_academique    (journal des actions sensibles)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Années académiques ──────────────────────────────────────────
        Schema::create('annees_academiques', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('restrict');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('libelle', 20)->default('');  // ex. 2026-2027, généré si vide
            $table->boolean('suspendu')->default(false);
            $table->text('note_suspension')->default('');
            $table->timestamps();

            $table->index(['etablissement_id', 'date_debut']);
        });

        // Contrainte : date_fin > date_debut
        DB::statement('ALTER TABLE annees_academiques ADD CONSTRAINT chk_annee_fin_apres_debut CHECK (date_fin > date_debut)');

        // ── Cycles actifs pour une année ───────────────────────────────
        Schema::create('cycles_config', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('annee_id')->constrained('annees_academiques')->onDelete('cascade');
            $table->enum('cycle', ['maternelle', 'primaire', 'secondaire', 'universitaire']);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['etablissement_id', 'annee_id', 'cycle'], 'uniq_cycle_config');
        });

        // ── Subdivisions pédagogiques (groupes / sections / départements) ──
        Schema::create('subdivisions_pedagogiques', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('annee_id')->constrained('annees_academiques')->onDelete('cascade');
            $table->foreignId('cycle_config_id')->constrained('cycles_config')->onDelete('cascade');
            $table->enum('type', ['groupe', 'section', 'departement'])->default('groupe');
            $table->string('nom', 100);
            $table->string('code', 20)->default('');
            $table->text('description')->default('');
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(
                ['etablissement_id', 'annee_id', 'cycle_config_id', 'nom'],
                'uniq_subdivision_nom',
            );
        });

        // ── Niveaux scolaires (référentiel par tenant et cycle) ─────────
        Schema::create('niveaux_scolaires', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->enum('cycle', ['maternelle', 'primaire', 'secondaire', 'universitaire']);
            $table->string('nom', 100);
            $table->string('abreviation', 20)->default('');
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['etablissement_id', 'cycle', 'nom'], 'uniq_niveau_nom');
        });

        // ── Séries / filières ───────────────────────────────────────────
        Schema::create('series_filieres', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->enum('cycle', ['maternelle', 'primaire', 'secondaire', 'universitaire']);
            // Pour l'université, rattachement optionnel au département
            $table->foreignId('subdivision_id')->nullable()->constrained('subdivisions_pedagogiques')->onDelete('set null');
            $table->string('nom', 100);
            $table->string('code', 20)->default('');
            $table->text('description')->default('');
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // Le code est unique par cycle et tenant (deux établissements peuvent avoir le même)
            $table->unique(['etablissement_id', 'cycle', 'code'], 'uniq_serie_code');
        });

        // ── Classes concrètes ───────────────────────────────────────────
        Schema::create('classes_config', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('annee_id')->constrained('annees_academiques')->onDelete('cascade');
            $table->foreignId('niveau_id')->constrained('niveaux_scolaires')->onDelete('cascade');
            $table->foreignId('subdivision_id')->constrained('subdivisions_pedagogiques')->onDelete('cascade');
            $table->foreignId('serie_id')->nullable()->constrained('series_filieres')->onDelete('set null');
            $table->string('sigle', 50)->default('');
            // Pont optionnel vers scolarite.classes (UUID externe)
            $table->uuid('classe_uuid_externe')->nullable();
            $table->unsignedSmallInteger('effectif_previsionnel')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(
                ['etablissement_id', 'annee_id', 'niveau_id', 'subdivision_id', 'serie_id'],
                'uniq_classe_config',
            );
            $table->index('classe_uuid_externe');
        });

        // ── Cohortes universitaires ─────────────────────────────────────
        Schema::create('cohortes_universitaires', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('annee_id')->constrained('annees_academiques')->onDelete('cascade');
            $table->foreignId('filiere_id')->constrained('series_filieres')->onDelete('cascade');
            $table->foreignId('niveau_id')->constrained('niveaux_scolaires')->onDelete('cascade');
            $table->enum('diplome', ['licence', 'master', 'doctorat', 'ingenieur', 'bts', 'dut', 'autre'])->default('licence');
            $table->string('lettre', 5)->default('');
            $table->string('sigle', 30)->default('');
            $table->string('semestres', 50)->default('');  // ex. "1,2"
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(
                ['etablissement_id', 'annee_id', 'filiere_id', 'niveau_id', 'lettre'],
                'uniq_cohorte',
            );
        });

        // ── Matières avec coefficient ───────────────────────────────────
        Schema::create('matieres_config', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('annee_id')->constrained('annees_academiques')->onDelete('cascade');
            $table->enum('cycle', ['maternelle', 'primaire', 'secondaire', 'universitaire']);
            $table->foreignId('niveau_id')->constrained('niveaux_scolaires')->onDelete('cascade');
            $table->foreignId('serie_id')->nullable()->constrained('series_filieres')->onDelete('set null');
            // UUID externe : evaluations.matieres (jamais de FK locale inter-microservice)
            $table->uuid('matiere_uuid_externe');
            $table->string('nom_matiere', 255);
            $table->string('code_matiere', 30)->default('');
            // NULL = non défini (maternelle/primaire). 0 est une valeur numérique différente.
            $table->decimal('coefficient', 5, 2)->nullable();
            $table->boolean('est_obligatoire')->default(true);
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(
                ['etablissement_id', 'annee_id', 'niveau_id', 'serie_id', 'matiere_uuid_externe'],
                'uniq_matiere_config',
            );
            $table->index('matiere_uuid_externe');
        });

        // ── Journal d'audit ─────────────────────────────────────────────
        Schema::create('audit_config_academique', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->string('action', 100);
            $table->string('entite', 100);
            $table->uuid('entite_uuid')->nullable();
            $table->jsonb('detail')->default('{}');
            // UUID externe : identite.utilisateurs
            $table->uuid('auteur_uuid')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['etablissement_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_config_academique');
        Schema::dropIfExists('matieres_config');
        Schema::dropIfExists('cohortes_universitaires');
        Schema::dropIfExists('classes_config');
        Schema::dropIfExists('series_filieres');
        Schema::dropIfExists('niveaux_scolaires');
        Schema::dropIfExists('subdivisions_pedagogiques');
        Schema::dropIfExists('cycles_config');
        Schema::dropIfExists('annees_academiques');
    }
};
