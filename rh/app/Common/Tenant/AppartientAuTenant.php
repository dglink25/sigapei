<?php

namespace App\Common\Tenant;

use Illuminate\Database\Eloquent\Builder;
use RuntimeException;

/**
 * Isolation multi-tenant au niveau du modèle (CDC §16 : "accès strictement filtré par tenant_id").
 *
 *  - toute requête est filtrée sur le tenant du contexte ;
 *  - sans contexte tenant, AUCUNE ligne n'est renvoyée (fail closed) - sauf en console
 *    (migrations, seeders) où le code doit passer explicitement par Contexte::executerPour() ;
 *  - à la création, tenant_id est imposé par le contexte : impossible d'écrire chez un autre tenant.
 */
trait AppartientAuTenant
{
    public static function bootAppartientAuTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $requete) {
            $colonne = $requete->getModel()->getTable().'.tenant_id';

            if (Contexte::aUnTenant()) {
                $requete->where($colonne, Contexte::tenantId());
            } elseif (! app()->runningInConsole()) {
                $requete->whereRaw('1 = 0');
            }
        });

        static::creating(function ($modele) {
            if (! Contexte::aUnTenant()) {
                throw new RuntimeException('Écriture refusée : aucun contexte tenant.');
            }
            if ($modele->tenant_id !== null && (int) $modele->tenant_id !== Contexte::tenantId()) {
                throw new RuntimeException('Écriture refusée : tenant différent du contexte.');
            }
            $modele->tenant_id = Contexte::tenantId();
        });

        static::updating(function ($modele) {
            if ($modele->isDirty('tenant_id')) {
                throw new RuntimeException('Le tenant d\'une ligne ne peut pas être modifié.');
            }
        });
    }
}
