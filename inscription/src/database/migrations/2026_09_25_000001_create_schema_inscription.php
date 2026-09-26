<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // S'assurer que le schema inscription existe
        DB::statement('CREATE SCHEMA IF NOT EXISTS inscription');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        // 1. Table candidatures
        Schema::create('inscription.candidatures', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->date('date_naissance');
            $table->string('sexe', 10)->nullable(); // M, F
            $table->string('email', 150)->nullable();
            $table->string('telephone', 50)->nullable();
            $table->text('adresse')->nullable();
            $table->unsignedBigInteger('classe_visee_id')->index(); // Reference scolarite.classes(id)
            $table->string('statut', 30)->default('soumise'); // soumise, en_attente, validee, rejetee
            $table->timestamp('date_soumission')->useCurrent();
            $table->text('motif_rejet')->nullable();
            
            // Coordonnees parent/tuteur rattachable
            $table->string('parent_nom', 100)->nullable();
            $table->string('parent_prenom', 100)->nullable();
            $table->string('parent_telephone', 50)->nullable();
            $table->string('parent_email', 150)->nullable();
            $table->string('parent_lien', 50)->default('parent'); // pere, mere, tuteur

            $table->timestamps();

            $table->index(['tenant_id', 'statut']);
            $table->index(['tenant_id', 'classe_visee_id']);
        });

        // 2. Table pieces_justificatives
        Schema::create('inscription.pieces_justificatives', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('candidature_id')->index();
            $table->string('type', 50); // bulletin, acte_naissance, certificat_nationalite, photo
            $table->string('nom_original', 255);
            $table->string('chemin_stockage', 500); // S3 / MinIO
            $table->unsignedBigInteger('taille_octets')->default(0);
            $table->string('mime_type', 100)->nullable();
            $table->string('statut_validation', 30)->default('en_attente'); // en_attente, conforme, non_conforme
            $table->timestamps();

            $table->foreign('candidature_id')
                ->references('id')
                ->on('inscription.candidatures')
                ->onDelete('cascade');
        });

        // 3. Table tests_admission
        Schema::create('inscription.tests_admission', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('candidature_id')->index();
            $table->string('type_test', 50); // test_ecrit, entretien, dossier
            $table->string('matiere', 100)->nullable();
            $table->decimal('note', 5, 2)->nullable();
            $table->decimal('note_max', 5, 2)->default(20.00);
            $table->string('resultat', 30)->default('en_attente'); // admis, recale, en_attente
            $table->text('observations')->nullable();
            $table->unsignedBigInteger('evalue_par_id')->nullable(); // Enseignant ou jury
            $table->date('date_test')->nullable();
            $table->timestamps();

            $table->foreign('candidature_id')
                ->references('id')
                ->on('inscription.candidatures')
                ->onDelete('cascade');
        });

        // 4. Table reinscriptions
        Schema::create('inscription.reinscriptions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->default(DB::raw('gen_random_uuid()'))->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('apprenant_id')->index(); // scolarite.apprenants
            $table->unsignedBigInteger('ancienne_classe_id')->index();
            $table->unsignedBigInteger('nouvelle_classe_id')->index();
            $table->string('annee_scolaire', 20); // ex: 2026-2027
            $table->string('statut', 30)->default('demandee'); // demandee, validee, rejetee
            $table->text('motif_rejet')->nullable();
            $table->timestamp('date_demande')->useCurrent();
            $table->timestamps();

            $table->index(['tenant_id', 'annee_scolaire']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscription.reinscriptions');
        Schema::dropIfExists('inscription.tests_admission');
        Schema::dropIfExists('inscription.pieces_justificatives');
        Schema::dropIfExists('inscription.candidatures');
    }
};
