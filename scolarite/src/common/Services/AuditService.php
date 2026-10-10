<?php

namespace App\common\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AuditService
{
    private static ?bool $tableExiste = null;

    /**
     * Journalise une action sensible dans scolarite.
     * Utilise le canal de log sécurisé de Laravel et n'interrompt JAMAIS
     * la transaction PostgreSQL en cours.
     */
    public static function journaliser(string $action, string $cible, array $details = []): void
    {
        // Le JWT Identité porte `sub` (UUID utilisateur) et `tenantId` (UUID
        // établissement), tandis que les colonnes d'audit sont des bigint.
        // On conserve les deux formes : l'UUID tel quel, et l'entier résolu
        // lorsqu'il est disponible. Aucune valeur n'est inventée.
        $tenantRef  = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $currentUser = app()->bound('current_user') ? app('current_user') : null;
        $auteurRef  = $currentUser['uuid'] ?? $currentUser['sub'] ?? null;

        $tenantUuid = is_string($tenantRef) && !is_numeric($tenantRef) ? $tenantRef : null;
        $auteurUuid = is_string($auteurRef) && !is_numeric($auteurRef) ? $auteurRef : null;

        $tenantId = is_numeric($tenantRef) ? (int) $tenantRef : null;
        $auteurId = is_numeric($auteurRef) ? (int) $auteurRef : null;

        // 1. Journalisation système systématique et sécurisée
        Log::info("[AUDIT-SCOLARITE] Tenant: {$tenantRef} | Auteur: {$auteurRef} | Action: {$action} | Cible: {$cible}", $details);

        // 2. Vérification préalable de l'existence de la table pour ne pas polluer la transaction PostgreSQL
        if (self::$tableExiste === null) {
            try {
                self::$tableExiste = Schema::hasTable('audit_log');
            } catch (\Throwable) {
                self::$tableExiste = false;
            }
        }

        if (self::$tableExiste) {
            try {
                DB::table('audit_log')->insert([
                    'tenant_id'   => $tenantId,
                    'tenant_uuid' => $tenantUuid,
                    'auteur_id'   => $auteurId,
                    'auteur_uuid' => $auteurUuid,
                    'action'      => $action,
                    'cible'       => $cible . ' ' . json_encode($details),
                    'horodatage'  => now(),
                ]);
            } catch (\Throwable $e) {
                // L'audit ne doit JAMAIS faire échouer la transaction métier.
                // Mais l'échec doit être visible, sinon la traçabilité
                // disparaît silencieusement (c'était le bug corrigé ici).
                Log::error('[AUDIT-SCOLARITE] Echec de persistance audit en base.', [
                    'action' => $action,
                    'erreur' => $e->getMessage(),
                ]);
            }
        } else {
            Log::warning('[AUDIT-SCOLARITE] Table audit_log absente : action tracee uniquement dans le log systeme.', [
                'action' => $action,
            ]);
        }
    }
}
