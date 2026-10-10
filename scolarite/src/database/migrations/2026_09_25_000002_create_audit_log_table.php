<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table d'audit du microservice Scolarité.
 *
 * Le CDC exige une traçabilité immuable de chaque action sensible
 * (transfert, création de classe, modification de créneau). Jusqu'ici
 * `AuditService::journaliser()` interrogeait `Schema::hasTable('audit_log')` :
 * la table n'ayant jamais été créée, l'audit partait uniquement dans le
 * fichier de log Laravel — perdu à chaque redéploiement.
 *
 * La table est créée dans le schéma `scolarite` (propriétaire exclusif),
 * conformément à la règle n°1 de la plateforme.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('scolarite.audit_log')) {
            return;
        }

        Schema::create('scolarite.audit_log', function (Blueprint $table) {
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
        Schema::dropIfExists('scolarite.audit_log');
    }
};
