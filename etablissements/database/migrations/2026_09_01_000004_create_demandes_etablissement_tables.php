<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Table pivot de l'onboarding (section 4 et 12.1) : brouillon puis demande
 * soumise, cycle de correction (jeton signe a usage unique, relance), et
 * reference croisee vers l'etablissement une fois valide.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes_etablissement', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));

            // Brouillon complet du formulaire 5 etapes (auto-save), format libre.
            $table->jsonb('donnees_formulaire')->nullable();

            // Champs structurants dupliques depuis donnees_formulaire une fois
            // connus, pour permettre indexation/jointures/validation cote serveur.
            $table->foreignId('arrondissement_id')->nullable()->constrained('arrondissements');
            $table->text('adresse_complete')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            $table->string('dirigeant_nom', 255)->nullable();
            $table->string('dirigeant_titre', 128)->nullable();
            $table->string('dirigeant_email', 255)->nullable();
            $table->string('dirigeant_telephone', 20)->nullable();

            $table->enum('statut', ['brouillon', 'soumise', 'correction_demandee', 'validee', 'rejetee'])
                ->default('brouillon');

            $table->jsonb('champs_a_corriger')->nullable();
            $table->string('lien_correction_token', 128)->nullable()->unique();
            $table->timestamp('lien_correction_expire_le')->nullable();
            $table->timestamp('date_dernier_rappel')->nullable();
            $table->timestamp('date_soumission')->nullable();

            $table->foreignId('etablissement_id')->nullable()->constrained('etablissements');

            $table->timestamps();
        });

        Schema::create('documents_etablissement', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));
            $table->foreignId('demande_id')->constrained('demandes_etablissement')->onDelete('cascade');
            $table->enum('type', ['autorisation', 'piece_identite', 'logo']);
            $table->string('chemin_stockage', 512);
            $table->string('mime_type', 128)->nullable();
            $table->unsignedBigInteger('taille_octets')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents_etablissement');
        Schema::dropIfExists('demandes_etablissement');
    }
};
