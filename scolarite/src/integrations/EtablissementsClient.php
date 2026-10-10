<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Client d'intégration avec le microservice Établissements.
 *
 * Accède en lecture directe au schéma `etablissements` de la base Neon commune.
 * La table centrale est `etablissements.etablissements` (clé `id` et `uuid`).
 * La table des modules est `etablissements.etablissement_modules` (clé `etablissement_id`).
 */
class EtablissementsClient
{
    /**
     * Résout l'ID numérique interne d'un établissement à partir d'un entier ou d'un UUID.
     */
    public function resoudreEtablissementId(string|int $tenantRef): ?int
    {
        if (is_numeric($tenantRef)) {
            return (int) $tenantRef;
        }

        try {
            $etab = DB::table('etablissements.etablissements')
                ->where('uuid', $tenantRef)
                ->select('id')
                ->first();

            return $etab ? (int) $etab->id : null;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Vérifie si un module est actif pour un établissement.
     *
     * Règle de sécurité : échec fermé (fail-closed). Établissement introuvable,
     * module absent ou schéma inaccessible valent « module inactif ».
     *
     * @param  string|int  $tenantRef   ID entier ou UUID de l'établissement
     * @param  string      $module      Nom du module : 'scolarite', 'inscription', etc.
     */
    public function estModuleActif(string|int $tenantRef, string $module = 'scolarite'): bool
    {
        try {
            $etablissementId = $this->resoudreEtablissementId($tenantRef);

            if ($etablissementId === null) {
                Log::warning('[ETABLISSEMENTS] Etablissement introuvable, module refuse par defaut.', [
                    'tenant_ref' => $tenantRef,
                    'module'     => $module,
                ]);
                return false;
            }

            $statut = DB::table('etablissements.etablissement_modules')
                ->where('etablissement_id', $etablissementId)
                ->where('module', $module)
                ->value('statut');

            if ($statut === null) {
                Log::warning('[ETABLISSEMENTS] Module absent de etablissement_modules, module refuse par defaut.', [
                    'etablissement_id' => $etablissementId,
                    'module'           => $module,
                ]);
                return false;
            }

            return $statut === 'actif';
        } catch (Throwable $e) {
            Log::error('[ETABLISSEMENTS] Schema etablissements inaccessible, module refuse par defaut.', [
                'tenant_ref' => $tenantRef,
                'module'     => $module,
                'erreur'     => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Retourne l'établissement complet par ID ou UUID.
     */
    public function obtenirEtablissement(string|int $tenantRef): ?object
    {
        try {
            $query = DB::table('etablissements.etablissements');

            if (is_numeric($tenantRef)) {
                $query->where('id', (int) $tenantRef);
            } else {
                $query->where('uuid', (string) $tenantRef);
            }

            return $query->first();
        } catch (Throwable) {
            return null;
        }
    }
}
