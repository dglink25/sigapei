<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Instantané figé à la clôture (CDC §3.2, §8). Tant que la période est ouverte, le bulletin est
 * calculé à la volée et rien n'est stocké. Chaque correction après clôture crée une NOUVELLE version ;
 * les anciennes restent consultables (CDC §9). Lignes immuables (trigger), sauf le lien vers le PDF
 * renseigné une fois par le job asynchrone.
 *  - contenu   : bulletin complet (lignes par matière, paramètres appliqués) tel que calculé
 *  - empreinte : SHA-256 du contenu canonique, pour prouver qu'il est reconstructible à l'identique
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulletins', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->foreignId('periode_id')->constrained('periodes')->restrictOnDelete();
            $table->uuid('apprenant_uuid');
            $table->uuid('classe_uuid');
            $table->unsignedInteger('version')->default(1);
            $table->decimal('moyenne', 6, 3)->nullable();
            $table->unsignedInteger('rang')->nullable();
            $table->boolean('ex_aequo')->default(false);
            $table->unsignedInteger('effectif');
            $table->decimal('moyenne_classe', 6, 3)->nullable();
            $table->string('mention', 60)->nullable();
            $table->jsonb('contenu');
            $table->char('empreinte', 64);
            $table->uuid('pdf_document_uuid')->nullable();
            $table->string('motif_version', 255)->nullable();
            $table->uuid('genere_par_uuid');
            $table->timestampTz('genere_le')->useCurrent();

            $table->unique(['periode_id', 'apprenant_uuid', 'version']);
            $table->index(['tenant_id', 'apprenant_uuid']);
            $table->index(['tenant_id', 'classe_uuid', 'periode_id']);
        });

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION evaluations.bulletins_verrou()
            RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'Bulletin archivé : suppression interdite' USING ERRCODE = 'insufficient_privilege';
                END IF;
                -- Seul l'ajout du PDF (une seule fois) est permis.
                IF OLD.pdf_document_uuid IS NULL AND NEW.pdf_document_uuid IS NOT NULL
                   AND (to_jsonb(NEW) - 'pdf_document_uuid') = (to_jsonb(OLD) - 'pdf_document_uuid') THEN
                    RETURN NEW;
                END IF;
                RAISE EXCEPTION 'Bulletin archivé : modification interdite (créer une nouvelle version)'
                    USING ERRCODE = 'insufficient_privilege';
            END;
            $$;
        SQL);
        DB::statement('CREATE TRIGGER bulletins_immuable BEFORE UPDATE OR DELETE ON bulletins FOR EACH ROW EXECUTE FUNCTION evaluations.bulletins_verrou()');
    }

    public function down(): void
    {
        Schema::dropIfExists('bulletins');
        DB::statement('DROP FUNCTION IF EXISTS evaluations.bulletins_verrou()');
    }
};
