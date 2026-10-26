<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * evaluations.notes - SOURCE UNIQUE de tout calcul (CDC §3).
 *  - statut : saisie | absent_justifie | absent_non_justifie | dispense
 *    valeur obligatoire si statut = saisie, interdite sinon (contrainte en base)
 *  - niveau_competence : grille "competences" (primaire), à la place d'une valeur chiffrée
 *  - version : verrou optimiste (deux enseignants/onglets ne s'écrasent jamais en silence)
 * Une note n'est jamais supprimée (suppression bloquée en base) : on change son statut, tracé dans audit_note.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('evaluation_id')->constrained('evaluations')->restrictOnDelete();
            $table->uuid('apprenant_uuid');
            $table->string('statut', 20)->default('saisie');
            $table->decimal('valeur', 5, 2)->nullable();
            $table->string('niveau_competence', 10)->nullable();
            $table->string('commentaire', 255)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('saisi_par_uuid');
            $table->timestampTz('saisi_le');
            $table->uuid('modifie_par_uuid')->nullable();
            $table->timestamps();

            $table->unique(['evaluation_id', 'apprenant_uuid']);
            $table->index(['tenant_id', 'apprenant_uuid']);
        });

        DB::statement("ALTER TABLE notes ADD CONSTRAINT notes_statut_chk CHECK (statut IN ('saisie','absent_justifie','absent_non_justifie','dispense'))");
        DB::statement('ALTER TABLE notes ADD CONSTRAINT notes_valeur_chk CHECK (valeur IS NULL OR valeur >= 0)');
        DB::statement("ALTER TABLE notes ADD CONSTRAINT notes_coherence_chk CHECK ((statut = 'saisie') = (valeur IS NOT NULL OR niveau_competence IS NOT NULL))");
        DB::statement('CREATE TRIGGER notes_sans_suppression BEFORE DELETE ON notes FOR EACH ROW EXECUTE FUNCTION evaluations.refuser_modification()');
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
