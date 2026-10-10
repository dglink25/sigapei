<?php

namespace App\common\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'audit du microservice Inscription.
 *
 * Garantit la traçabilité immuable des validations, rejets et réinscriptions
 * exigée par le CDC. Ne doit JAMAIS faire échouer la transaction métier en
 * cours : une erreur d'écriture est journalisée en ERROR, pas avalée.
 */
class AuditService
{
    private static ?bool $tableExiste = null;

    /**
     * Journalise une action sensible.
     *
     * Tenant et auteur sont stockés sous leurs deux formes : l'entier interne
     * et l'UUID porté par le JWT Identité (claim `tenantId` / `sub`).
     */
    public static function journaliser(string $action, string $cible, array $details = []): void
    {
        $tenantRef   = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $currentUser = app()->bound('current_user') ? app('current_user') : null;
        $auteurRef   = $currentUser['uuid'] ?? $currentUser['sub'] ?? null;

        $tenantUuid = is_string($tenantRef) && !is_numeric($tenantRef) ? $tenantRef : null;
        $auteurUuid = is_string($auteurRef) && !is_numeric($auteurRef) ? $auteurRef : null;

        $tenantId = is_numeric($tenantRef) ? (int) $tenantRef : null;
        $auteurId = is_numeric($auteurRef) ? (int) $auteurRef : null;

        Log::info("[AUDIT-INSCRIPTION] Tenant: {$tenantRef} | Auteur: {$auteurRef} | Action: {$action} | Cible: {$cible}", $details);

        if (self::$tableExiste === null) {
            try {
                self::$tableExiste = Schema::hasTable('audit_log');
            } catch (\Throwable) {
                self::$tableExiste = false;
            }
        }

        if (!self::$tableExiste) {
            Log::warning('[AUDIT-INSCRIPTION] Table audit_log absente : action tracee uniquement dans le log systeme.', [
                'action' => $action,
            ]);
            return;
        }

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
            Log::error('[AUDIT-INSCRIPTION] Echec de persistance audit en base.', [
                'action' => $action,
                'erreur' => $e->getMessage(),
            ]);
        }
    }
}
