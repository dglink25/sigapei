<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mise en page du bulletin par établissement et cycle (CDC §4.1). Présentation uniquement :
 * les règles de calcul (arrondi, mentions...) sont dans parametres_notation.
 * Sans modèle configuré, le modèle par défaut de la plateforme s'applique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modele_bulletin', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->string('cycle', 20);
            $table->jsonb('en_tete');               // {"titre":..., "sous_titre":..., "logo_document_uuid":...}
            $table->jsonb('colonnes_affichees');    // ["matiere","coefficient","moyenne","moyenne_classe","rang","appreciation"]
            $table->text('mentions_bas_de_page')->nullable();
            $table->uuid('modifie_par_uuid');
            $table->timestamps();

            $table->unique(['tenant_id', 'cycle']);
        });
        DB::statement("ALTER TABLE modele_bulletin ADD CONSTRAINT mb_cycle_chk CHECK (cycle IN ('primaire','secondaire','universitaire'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('modele_bulletin');
    }
};
