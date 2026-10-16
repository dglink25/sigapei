<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel du personnel d'un établissement (CDC RH §personnel).
 *
 * `id` interne (bigint) n'est jamais exposé : toutes les API et références
 * croisées utilisent `uuid` (CDC plateforme §13). `utilisateur_uuid` est
 * l'UUID du compte du microservice Identité : référence EXTERNE, jamais de FK.
 * `matricule` est unique par tenant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personnel', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->unsignedBigInteger('tenant_id');
            $table->uuid('utilisateur_uuid')->nullable(); // compte Identité (externe)
            $table->string('matricule', 40);
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->string('email', 190)->nullable();
            $table->string('telephone', 30)->nullable();
            $table->string('sexe', 1)->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance', 150)->nullable();
            $table->string('adresse', 255)->nullable();
            $table->string('type_personnel', 30);   // enseignant, administratif, direction...
            $table->string('fonction', 150)->nullable();
            $table->foreignId('grade_id')->nullable()->constrained('grades')->restrictOnDelete();
            $table->date('date_embauche')->nullable();
            $table->string('statut', 20)->default('actif'); // actif, suspendu, inactif, retraite
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'matricule']);
            $table->index(['tenant_id', 'actif']);
            $table->index(['tenant_id', 'type_personnel']);
            $table->index(['tenant_id', 'utilisateur_uuid']);
        });

        DB::statement("ALTER TABLE personnel ADD CONSTRAINT personnel_sexe_chk CHECK (sexe IN ('M', 'F') OR sexe IS NULL)");
        DB::statement('ALTER TABLE personnel ADD CONSTRAINT personnel_type_chk CHECK (type_personnel <> \'\')');
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel');
    }
};
