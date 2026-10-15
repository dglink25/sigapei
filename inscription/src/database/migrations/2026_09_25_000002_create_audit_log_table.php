<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table d'audit du microservice Inscription.
 *
 * Le CDC exige une traçabilité immuable des validations et rejets de
 * candidature. `AuditService::journaliser()` testait `Schema::hasTable('audit_log')`
 * alors que la table n'existait pas : l'audit était perdu au redéploiement.
 *
 * La table est créée dans le schéma `inscription` (propriétaire exclusif).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('inscription.audit_log')) {
            return;
        }

        Schema::create('inscription.audit_log', function (Blueprint $table) {
            $table->bigIncrements('id');

            // Tenant et auteur sont stockés sous leurs deux formes : l'entier
            // interne (jointures, agrégations) et l'UUID du JWT Identité
            // (traçabilité fidèle de qui a réellement agi). Les colonnes
            // entières sont nullables car le claim `tenantId` du JWT est un
            // UUID et non un bigint (voir Arbitrage contrat tenant_id).
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->uuid('tenant_uuid')->nullable()->index();
            $table->unsignedBigInteger('auteur_id')->nullable()->index();
            $table->uuid('auteur_uuid')->nullable()->index();

            $table->string('action', 100)->index();
            $table->text('cible');
            $table->timestamp('horodatage')->useCurrent();

            $table->index(['tenant_id', 'horodatage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscription.audit_log');
    }
};
