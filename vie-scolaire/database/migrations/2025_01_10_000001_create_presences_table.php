<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table vie_scolaire.presences — section 6 et 40 du CDC.
 *
 * apprenant_id et cours_id sont des cles etrangeres EXTERNES vers le
 * schema scolarite (scolarite.apprenants, scolarite.emplois_du_temps).
 * Conformement au principe de base unique par schemas logiques
 * (CDC plateforme, section 39), aucune contrainte FK Postgres n'est posee
 * vers un schema qui n'appartient pas a ce microservice : la coherence
 * est garantie applicativement par jointure au moment de la requete
 * (ScolariteClient), pas par une contrainte inter-schema figee.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presences', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->unsignedBigInteger('tenant_id');

            // References externes (schema scolarite), non contraintes en base.
            $table->unsignedBigInteger('apprenant_id');
            $table->unsignedBigInteger('cours_id');

            $table->enum('statut', ['present', 'absent', 'retard'])->default('absent');
            $table->date('date');

            // Journalisation de la correction a posteriori (section 9 / A2).
            $table->unsignedBigInteger('corrige_par_id')->nullable();
            $table->text('motif_correction')->nullable();
            $table->timestamp('corrige_le')->nullable();

            $table->timestamps();

            $table->index('tenant_id');
            $table->index(['tenant_id', 'apprenant_id', 'date']);
            $table->index(['tenant_id', 'cours_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presences');
    }
};
