<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // S'assurer que le schema scolarite existe
        DB::statement('CREATE SCHEMA IF NOT EXISTS scolarite');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        // 1. Table cycles_niveaux_classes (ou classes)
        Schema::create('scolarite.classes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('nom', 100);
            $table->string('cycle', 50); // primaire, secondaire, universitaire
            $table->string('niveau', 50); // CI, CP, 6e, Terminale, L1, etc.
            $table->string('filiere', 100)->nullable(); // Scientifique, Litteraire, etc.
            $table->string('programme', 20)->default('beninois'); // beninois | francais
            $table->unsignedInteger('capacite')->default(40);
            $table->string('statut', 20)->default('actif'); // actif, archive
            $table->timestamps();

            $table->index(['tenant_id', 'cycle']);
            $table->index(['tenant_id', 'programme']);
        });

        // 2. Table apprenants
        Schema::create('scolarite.apprenants', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('classe_id')->index();
            $table->unsignedBigInteger('utilisateur_id')->nullable()->index(); // Nullable si programme beninois ou primaire sans compte
            $table->unsignedBigInteger('candidature_id')->nullable()->index(); // Tracabilite admission
            $table->string('matricule', 50)->nullable()->unique();
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->date('date_naissance');
            $table->string('sexe', 10)->nullable(); // M, F
            $table->string('statut', 20)->default('actif'); // actif, transfere, radie, diplome, archive
            $table->timestamps();

            $table->foreign('classe_id')
                ->references('id')
                ->on('scolarite.classes')
                ->onDelete('restrict');

            $table->index(['tenant_id', 'statut']);
        });

        // 3. Table historique_classes (mutations et transferts internes)
        Schema::create('scolarite.historique_classes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('apprenant_id')->index();
            $table->unsignedBigInteger('ancienne_classe_id')->index();
            $table->unsignedBigInteger('nouvelle_classe_id')->index();
            $table->string('motif', 255)->nullable();
            $table->timestamp('date_transfert')->useCurrent();
            $table->unsignedBigInteger('effectue_par_utilisateur_id')->nullable();
            $table->timestamps();

            $table->foreign('apprenant_id')
                ->references('id')
                ->on('scolarite.apprenants')
                ->onDelete('cascade');

            $table->foreign('ancienne_classe_id')
                ->references('id')
                ->on('scolarite.classes')
                ->onDelete('restrict');

            $table->foreign('nouvelle_classe_id')
                ->references('id')
                ->on('scolarite.classes')
                ->onDelete('restrict');
        });

        // 4. Table emplois_du_temps
        Schema::create('scolarite.emplois_du_temps', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('classe_id')->index();
            $table->unsignedBigInteger('enseignant_id')->index(); // Personnel RH
            $table->unsignedBigInteger('matiere_id')->index(); // Matiere Evaluations
            $table->string('creneau', 50)->nullable(); // ex: Lundi 08h-10h
            $table->string('jour', 20); // lundi, mardi, mercredi, jeudi, vendredi, samedi
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->string('salle', 50)->nullable();
            $table->string('statut', 20)->default('actif');
            $table->timestamps();

            $table->foreign('classe_id')
                ->references('id')
                ->on('scolarite.classes')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'jour']);
        });

        // 5. Table parents_apprenants (liaison parent-enfant multi-etablissements)
        Schema::create('scolarite.parents_apprenants', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('parent_id')->index(); // Utilisateur Identite (role parent)
            $table->unsignedBigInteger('apprenant_id')->index();
            $table->string('lien_parente', 50)->default('parent'); // pere, mere, tuteur
            $table->boolean('est_responsable_legal')->default(true);
            $table->boolean('est_contact_urgence')->default(false);
            $table->timestamps();

            $table->foreign('apprenant_id')
                ->references('id')
                ->on('scolarite.apprenants')
                ->onDelete('cascade');

            $table->unique(['tenant_id', 'parent_id', 'apprenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scolarite.parents_apprenants');
        Schema::dropIfExists('scolarite.emplois_du_temps');
        Schema::dropIfExists('scolarite.historique_classes');
        Schema::dropIfExists('scolarite.apprenants');
        Schema::dropIfExists('scolarite.classes');
    }
};
