<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table vie_scolaire.incidents_disciplinaires — section 6 et 40 du CDC.
 *
 * apprenant_id : reference externe vers scolarite.apprenants.
 * auteur_id    : reference externe vers rh.personnel (enseignant/censeur
 *                a l'origine du signalement, section 6 : "Les incidents
 *                disciplinaires referencent en complement l'auteur du
 *                signalement (personnel, schema rh)").
 *
 * Regle de gestion (section 9) : un incident peut exister sans sanction
 * immediate ; une sanction ne peut jamais exister sans incident associe.
 * On modelise donc la sanction comme un etat de l'incident plutot que
 * comme une table separee, ce qui rend cette regle impossible a violer
 * au niveau du schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidents_disciplinaires', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->unsignedBigInteger('tenant_id');

            $table->unsignedBigInteger('apprenant_id');
            $table->unsignedBigInteger('auteur_id');

            $table->string('type')->comment('retard, comportement, absence_non_justifiee_repetee, autre');
            $table->text('description');

            $table->text('sanction')->nullable();
            $table->unsignedBigInteger('sanction_appliquee_par_id')->nullable();
            $table->timestamp('sanction_appliquee_le')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'apprenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents_disciplinaires');
    }
};
