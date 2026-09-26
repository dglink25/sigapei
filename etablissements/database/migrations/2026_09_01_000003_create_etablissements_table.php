<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Registre central de chaque etablissement valide (section 12.1).
 * "id" fait office de tenant_id (usage technique interne, jamais expose ;
 * seul "uuid" est expose dans les reponses API, "slug" dans les URLs).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('etablissements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('uuid_generate_v4()'));
            $table->string('slug', 160)->unique();
            $table->string('matricule', 32)->unique();
            $table->string('nom', 255);
            $table->string('logo_document_id', 64)->nullable();
            // Types demandes a l'etape 1 : ["primaire","secondaire","universite"].
            $table->jsonb('types');
            $table->unsignedSmallInteger('annee_ouverture');
            $table->foreignId('arrondissement_id')->constrained('arrondissements');
            $table->text('adresse_complete');
            $table->string('email', 255);
            $table->string('telephone_1', 20);
            $table->string('telephone_2', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->enum('statut', ['actif', 'suspendu', 'archive'])->default('actif');
            $table->timestamp('date_validation')->useCurrent();
            $table->timestamps();
        });

        Schema::create('cycles_autorises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->enum('cycle', ['maternelle', 'primaire', 'secondaire', 'universitaire']);
            $table->enum('statut', ['actif', 'inactif'])->default('actif');
            $table->timestamps();
            $table->unique(['etablissement_id', 'cycle']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cycles_autorises');
        Schema::dropIfExists('etablissements');
    }
};
