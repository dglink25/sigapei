<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. cycles_config : support du cycle unique (groupe unique)
        Schema::table('cycles_config', function (Blueprint $table) {
            if (!Schema::hasColumn('cycles_config', 'cycle_unique')) {
                $table->boolean('cycle_unique')->default(false)->after('actif');
            }
        });

        // 2. subdivisions_pedagogiques : cycle universitaire & option unique
        Schema::table('subdivisions_pedagogiques', function (Blueprint $table) {
            if (!Schema::hasColumn('subdivisions_pedagogiques', 'cycle_univ')) {
                $table->string('cycle_univ', 50)->nullable()->after('type'); // licence, licence_pro, master, doctorat
            }
            if (!Schema::hasColumn('subdivisions_pedagogiques', 'option_unique')) {
                $table->boolean('option_unique')->default(false)->after('cycle_univ');
            }
        });

        // 3. niveaux_scolaires : promotions secondaire (a_series) & niveaux universitaire
        Schema::table('niveaux_scolaires', function (Blueprint $table) {
            if (!Schema::hasColumn('niveaux_scolaires', 'a_series')) {
                $table->boolean('a_series')->default(false)->after('ordre');
            }
            if (!Schema::hasColumn('niveaux_scolaires', 'cycle_univ')) {
                $table->string('cycle_univ', 50)->nullable()->after('a_series');
            }
            if (!Schema::hasColumn('niveaux_scolaires', 'subdivision_id')) {
                $table->foreignId('subdivision_id')->nullable()->after('cycle_univ')
                    ->constrained('subdivisions_pedagogiques')->onDelete('cascade');
            }
            if (!Schema::hasColumn('niveaux_scolaires', 'serie_id')) {
                $table->foreignId('serie_id')->nullable()->after('subdivision_id')
                    ->constrained('series_filieres')->onDelete('cascade');
            }
        });

        // 4. series_filieres : rattachement optionnel à une promotion (secondaire) ou cycle univ
        Schema::table('series_filieres', function (Blueprint $table) {
            if (!Schema::hasColumn('series_filieres', 'promotion_id')) {
                $table->foreignId('promotion_id')->nullable()->after('subdivision_id')
                    ->constrained('niveaux_scolaires')->onDelete('cascade');
            }
            if (!Schema::hasColumn('series_filieres', 'cycle_univ')) {
                $table->string('cycle_univ', 50)->nullable()->after('promotion_id');
            }
        });

        // 5. classes_config : nom explicite, mode_numerotation et subdivision_id rendu nullable
        Schema::table('classes_config', function (Blueprint $table) {
            if (!Schema::hasColumn('classes_config', 'nom')) {
                $table->string('nom', 100)->nullable()->after('sigle');
            }
            if (!Schema::hasColumn('classes_config', 'mode_numerotation')) {
                $table->string('mode_numerotation', 30)->default('alphabetique')->after('nom'); // unique, alphabetique, numerique
            }
        });

        // Rendre subdivision_id nullable dans classes_config si présent
        DB::statement('ALTER TABLE classes_config ALTER COLUMN subdivision_id DROP NOT NULL');

        // 6. cohortes_universitaires : rattachement département & cycle univ
        Schema::table('cohortes_universitaires', function (Blueprint $table) {
            if (!Schema::hasColumn('cohortes_universitaires', 'subdivision_id')) {
                $table->foreignId('subdivision_id')->nullable()->after('filiere_id')
                    ->constrained('subdivisions_pedagogiques')->onDelete('cascade');
            }
            if (!Schema::hasColumn('cohortes_universitaires', 'cycle_univ')) {
                $table->string('cycle_univ', 50)->nullable()->after('diplome');
            }
        });

        // 7. matieres_config : rattachements ciblés
        Schema::table('matieres_config', function (Blueprint $table) {
            if (!Schema::hasColumn('matieres_config', 'promotion_id')) {
                $table->foreignId('promotion_id')->nullable()->after('serie_id')
                    ->constrained('niveaux_scolaires')->onDelete('cascade');
            }
            if (!Schema::hasColumn('matieres_config', 'classe_id')) {
                $table->foreignId('classe_id')->nullable()->after('promotion_id')
                    ->constrained('classes_config')->onDelete('cascade');
            }
            if (!Schema::hasColumn('matieres_config', 'cohorte_id')) {
                $table->foreignId('cohorte_id')->nullable()->after('classe_id')
                    ->constrained('cohortes_universitaires')->onDelete('cascade');
            }
        });
    }

    public function down(): void
    {
        Schema::table('matieres_config', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
            $table->dropForeign(['classe_id']);
            $table->dropForeign(['cohorte_id']);
            $table->dropColumn(['promotion_id', 'classe_id', 'cohorte_id']);
        });

        Schema::table('cohortes_universitaires', function (Blueprint $table) {
            $table->dropForeign(['subdivision_id']);
            $table->dropColumn(['subdivision_id', 'cycle_univ']);
        });

        Schema::table('classes_config', function (Blueprint $table) {
            $table->dropColumn(['nom', 'mode_numerotation']);
        });

        Schema::table('series_filieres', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
            $table->dropColumn(['promotion_id', 'cycle_univ']);
        });

        Schema::table('niveaux_scolaires', function (Blueprint $table) {
            $table->dropForeign(['subdivision_id']);
            $table->dropForeign(['serie_id']);
            $table->dropColumn(['a_series', 'cycle_univ', 'subdivision_id', 'serie_id']);
        });

        Schema::table('subdivisions_pedagogiques', function (Blueprint $table) {
            $table->dropColumn(['cycle_univ', 'option_unique']);
        });

        Schema::table('cycles_config', function (Blueprint $table) {
            $table->dropColumn(['cycle_unique']);
        });
    }
};
