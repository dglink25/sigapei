<?php

namespace App\integrations;

use App\common\Services\InterneClient;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Client d'intégration avec le microservice Établissements.
 *
 * Règle n°1 : plus de lecture directe du schéma `etablissements`. Le statut
 * des modules et les données de l'établissement se récupèrent via son API
 * interne.
 *
 * Règle de sécurité : le contrôle d'activation est en ÉCHEC FERMÉ. Un
 * établissement introuvable, un module absent ou un microservice injoignable
 * valent « module inactif » et bloquent l'opération. Le CDC exige un
 * contrôle bloquant : un fail-open permettrait d'admettre des candidats sur un
 * établissement suspendu.
 */
class EtablissementsClient
{
    public function __construct(
        protected InterneClient $interne
    ) {}

    /**
     * Vérifie si un module est actif pour un établissement.
     *
     * @param  string|int  $tenantRef  ID entier ou UUID de l'établissement
     * @param  string      $module     Nom du module : 'inscription', 'scolarite', etc.
     */
    public function estModuleActif(string|int $tenantRef, string $module = 'scolarite'): bool
    {
        try {
            $requete = is_numeric($tenantRef)
                ? ['etablissement_id' => (int) $tenantRef]
                : ['uuid' => (string) $tenantRef];

            $reponse = $this->interne->get('etablissements', '/v1/interne/modules', array_merge($requete, [
                'module' => $module,
            ]));

            if (!$reponse) {
                Log::warning('[ETABLISSEMENTS] Module absent, module refusé par défaut.', [
                    'tenant_ref' => $tenantRef,
                    'module'     => $module,
                ]);
                return false;
            }

            $donnees = $reponse['donnees'] ?? $reponse;

            return ($donnees['statut'] ?? null) === 'actif';
        } catch (Throwable $e) {
            Log::error('[ETABLISSEMENTS] Microservice injoignable, module refusé par défaut.', [
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
            $requete = is_numeric($tenantRef)
                ? ['id' => (int) $tenantRef]
                : ['uuid' => (string) $tenantRef];

            $reponse = $this->interne->get('etablissements', '/v1/interne/etablissements', $requete);
        } catch (Throwable) {
            return null;
        }

        return $reponse ? (object) ($reponse['donnees'] ?? $reponse) : null;
    }

    /**
     * Liste des modules actifs d'un établissement.
     * Échec fermé : renvoie une liste vide si l'appel échoue.
     *
     * @return string[]
     */
    public function modulesActifs(string|int $tenantRef): array
    {
        try {
            $requete = is_numeric($tenantRef)
                ? ['etablissement_id' => (int) $tenantRef]
                : ['uuid' => (string) $tenantRef];

            $reponse = $this->interne->get('etablissements', '/v1/interne/modules', $requete);

            if (!$reponse) {
                return [];
            }

            $donnees = $reponse['donnees'] ?? $reponse;

            return array_values((array) ($donnees['modules'] ?? []));
        } catch (Throwable $e) {
            Log::error('[ETABLISSEMENTS] Microservice injoignable, aucun module actif.', [
                'tenant_ref' => $tenantRef,
                'erreur'     => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Résout l'identifiant numérique interne d'un établissement à partir d'un
     * entier ou d'un UUID. Retourne null si l'établissement est inconnu.
     */
    public function resoudreEtablissementId(string|int $tenantRef): ?int
    {
        if (is_numeric($tenantRef)) {
            return (int) $tenantRef;
        }

        $etablissement = $this->obtenirEtablissement($tenantRef);

        return $etablissement->id ?? null;
    }
}
