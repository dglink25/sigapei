<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Règles de calcul par établissement et par cycle (CDC §5, §7) — jamais codées en dur.
 * Séparé de modele_bulletin (mise en page) : le CDC §4.1 interdit de mélanger mise en forme
 * et logique de calcul.
 *
 *  - methode_moyenne      : par_matiere (défaut : moyenne par matière puis Σ(moy×coef matière)/Σcoef)
 *                           | globale (formule littérale CDC §5 : Σ(note×coef éval×coef matière)/Σ(coef éval×coef matière))
 *  - decimales            : précision des moyennes (défaut 2), arrondi au plus proche (demi vers le haut)
 *  - note_non_saisie      : exclure | zero (choix affiché sur le bulletin, CDC §5)
 *  - absence_non_justifiee: zero | exclure
 *  - regle_rattrapage     : remplacer | meilleure | moyenne
 *  - classement_actif     : rang exposé ou non (CDC §7)
 *  - echelle_appreciation : [{"min":16,"max":20,"mention":"Très bien"}, ...] tranches [min, max[,
 *                           la dernière inclut max ; contiguës, validées à l'enregistrement
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parametres_notation', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->string('cycle', 20);
            $table->foreignId('grille_id')->constrained('grilles_evaluation')->restrictOnDelete();
            $table->string('methode_moyenne', 12)->default('par_matiere');
            $table->unsignedSmallInteger('decimales')->default(2);
            $table->string('note_non_saisie', 10)->default('exclure');
            $table->string('absence_non_justifiee', 10)->default('zero');
            $table->string('regle_rattrapage', 12)->default('meilleure');
            $table->boolean('classement_actif')->default(true);
            $table->jsonb('echelle_appreciation');
            $table->unsignedSmallInteger('delai_escalade_contestation_jours')->default(7);
            $table->uuid('modifie_par_uuid')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'cycle']);
        });

        DB::statement("ALTER TABLE parametres_notation ADD CONSTRAINT pn_cycle_chk CHECK (cycle IN ('primaire','secondaire','universitaire'))");
        DB::statement("ALTER TABLE parametres_notation ADD CONSTRAINT pn_methode_chk CHECK (methode_moyenne IN ('par_matiere','globale'))");
        DB::statement('ALTER TABLE parametres_notation ADD CONSTRAINT pn_decimales_chk CHECK (decimales BETWEEN 0 AND 3)');
        DB::statement("ALTER TABLE parametres_notation ADD CONSTRAINT pn_non_saisie_chk CHECK (note_non_saisie IN ('exclure','zero'))");
        DB::statement("ALTER TABLE parametres_notation ADD CONSTRAINT pn_absence_chk CHECK (absence_non_justifiee IN ('exclure','zero'))");
        DB::statement("ALTER TABLE parametres_notation ADD CONSTRAINT pn_rattrapage_chk CHECK (regle_rattrapage IN ('remplacer','meilleure','moyenne'))");
        DB::statement('ALTER TABLE parametres_notation ADD CONSTRAINT pn_delai_chk CHECK (delai_escalade_contestation_jours BETWEEN 1 AND 90)');
    }

    public function down(): void
    {
        Schema::dropIfExists('parametres_notation');
    }
};
