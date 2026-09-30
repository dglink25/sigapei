<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Throwable;

class EtablissementsClient
{
    /**
     * Verifie si le module "inscription" est actif pour le tenant
     */
    public function estModuleActif(int $tenantId, string $module = 'inscription'): bool
    {
        try {
            $enregistrement = DB::table('etablissements.etablissement_modules')
                ->where('tenant_id', $tenantId)
                ->where('module', $module)
                ->where('statut', 'actif')
                ->first();

            return ($enregistrement !== null);
        } catch (Throwable $e) {
            // Si la table etablissements n'est pas encore migree en environnement local de test
            return true;
        }
    }
}
