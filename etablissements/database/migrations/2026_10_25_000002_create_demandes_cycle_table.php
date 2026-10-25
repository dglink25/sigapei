<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes d'extension de cycle.
 *
 * Un établissement peut demander à bénéficier d'un cycle dont il ne
 * dispose pas encore (non présent dans cycles_autorises).
 * Le Super Administrateur instruit la demande et l'accepte ou la refuse.
 *
 * Cycle de vie : en_attente → acceptee | refusee
 * Une demande acceptée crée automatiquement la ligne dans cycles_autorises.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes_cycle', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->enum('cycle', ['maternelle', 'primaire', 'secondaire', 'universitaire']);
            $table->enum('statut', ['en_attente', 'acceptee', 'refusee'])->default('en_attente');
            $table->text('motif')->default('');              // justification de l'établissement
            $table->text('note_instruction')->default('');   // note du Super Admin
            $table->uuid('instruit_par')->nullable();        // UUID Super Admin (externe)
            $table->timestamp('date_instruction')->nullable();
            $table->timestamps();

            $table->unique(['etablissement_id', 'cycle', 'statut'], 'uniq_demande_cycle_en_attente');
            $table->index(['statut', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demandes_cycle');
    }
};
