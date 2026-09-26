<?php

namespace App\common\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditService
{
    /**
     * Journalise une action sensible dans audit_log
     */
    public static function journaliser(string $action, string $cible, array $details = []): void
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : 1;
        $currentUser = app()->bound('current_user') ? app('current_user') : null;
        $auteurId = $currentUser['sub'] ?? 1;

        try {
            // Si la table audit_log existe dans la base
            DB::statement(
                "INSERT INTO audit_log (tenant_id, auteur_id, action, cible, horodatage) 
                 VALUES (?, ?, ?, ?, NOW()) 
                 ON CONFLICT DO NOTHING",
                [$tenantId, $auteurId, $action, $cible . ' ' . json_encode($details)]
            );
        } catch (\Throwable $e) {
            // Ne bloque pas la transaction metier si audit_log est indisponible
            Log::info("[AUDIT] Tenant: {$tenantId} | Auteur: {$auteurId} | Action: {$action} | Cible: {$cible}", $details);
        }
    }
}
