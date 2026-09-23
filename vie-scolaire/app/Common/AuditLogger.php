<?php

namespace App\Common;

use App\Models\AuditLog;

/**
 * Journalise de façon inaltérable les actions sensibles (section 10 du CDC) :
 * corrections de présence, incidents disciplinaires et sanctions. Chaque
 * entrée est horodatée, rattachée à son tenant et à son auteur.
 */
final class AuditLogger
{
    public const ACTION_PRESENCE_CORRIGEE = 'presence_corrigee';

    public const ACTION_INCIDENT_AJOUTE = 'incident_ajoute';

    public const ACTION_SANCTION_APPLIQUEE = 'sanction_appliquee';

    public static function journalise(
        string $action,
        string $entite,
        string $entiteUuid,
        array $avant = [],
        array $apres = [],
        ?string $motif = null,
        ?string $acteurId = null,
    ): AuditLog {
        return AuditLog::create([
            'tenant_id' => TenantContext::tenantId(),
            'acteur_id' => $acteurId ?? TenantContext::userId(),
            'action' => $action,
            'entite' => $entite,
            'entite_uuid' => $entiteUuid,
            'avant' => $avant ?: null,
            'apres' => $apres ?: null,
            'motif' => $motif,
        ]);
    }
}
