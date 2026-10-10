<?php

namespace App\common\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Résolution du tenant (établissement) au format attendu par Scolarité.
 *
 * PROBLÈME ARCHITECTURAL
 * ---------------------
 * Le JWT émis par le microservice Identité porte un claim `tenantId` qui est
 * un **uuid** :
 *
 *     identite/src/database/migrations/…-CreationSchemaIdentite.ts
 *     "tenantId" uuid NULL,
 *
 * Or les colonnes `tenant_id` des schémas `scolarite` et `inscription` sont
 * des **bigint** :
 *
 *     $table->unsignedBigInteger('tenant_id')->index();
 *
 * Comparer un uuid à un bigint fait échouer PostgreSQL (22P02 invalid input
 * syntax for type bigint) sur TOUTES les requêtes Eloquent, via le
 * `TenantScope`. Ce service fait le pont entre les deux représentations en
 * s'appuyant sur la seule table qui porte les deux : `etablissements.etablissements`
 * (colonnes `id` bigint et `uuid`).
 *
 * Le microservice n'écrit jamais dans un autre schéma : seule la lecture de
 * cette table de référence est effectuée, comme pour le contrôle de module.
 */
class TenantResolver
{
    /** @var array<string|int, int|null> Cache de résolution pour la durée de la requête. */
    private array $cache = [];

    /**
     * Résout une référence de tenant (uuid ou entier) vers l'entier interne.
     *
     * @throws \RuntimeException si la référence est absente, non résoluble,
     *                           ou inconnue du référentiel des établissements.
     */
    public function resoudre(string|int|null $tenantRef): int
    {
        if ($tenantRef === null || $tenantRef === '') {
            throw new \RuntimeException(
                "Tenant introuvable dans le contexte d'authentification."
            );
        }

        $cle = is_numeric($tenantRef) ? 'i:' . $tenantRef : 'u:' . $tenantRef;

        if (array_key_exists($cle, $this->cache)) {
            $resolu = $this->cache[$cle];
            if ($resolu === null) {
                throw new \RuntimeException("Tenant inconnu du référentiel : {$tenantRef}.");
            }
            return $resolu;
        }

        // Un entier est déjà l'identifiant interne : on le renvoie tel quel,
        // après vérification d'existence pour ne pas laisser passer un tenant
        // inventé par un client.
        if (is_numeric($tenantRef)) {
            $existe = $this->existeEtablissementParId((int) $tenantRef);
            $this->cache[$cle] = $existe ? (int) $tenantRef : null;
            if (!$existe) {
                throw new \RuntimeException("Tenant inconnu du référentiel : {$tenantRef}.");
            }
            return (int) $tenantRef;
        }

        $id = $this->resoudreUuidVersId((string) $tenantRef);
        $this->cache[$cle] = $id;

        if ($id === null) {
            throw new \RuntimeException(
                "Tenant {$tenantRef} absent du référentiel des établissements."
            );
        }

        return $id;
    }

    /**
     * Variante non bloquante : renvoie null au lieu de lever.
     */
    public function resoudreOuNull(string|int|null $tenantRef): ?int
    {
        try {
            return $this->resoudre($tenantRef);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Résout le tenant courant mis dans le conteneur par le middleware JWT.
     */
    public function resoudreCourant(): int
    {
        $ref = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        return $this->resoudre($ref);
    }

    private function resoudreUuidVersId(string $uuid): ?int
    {
        try {
            $etab = DB::table('etablissements.etablissements')
                ->where('uuid', $uuid)
                ->select('id')
                ->first();

            return $etab ? (int) $etab->id : null;
        } catch (Throwable $e) {
            Log::error('[TENANT] Referentiel etablissements inaccessible.', [
                'uuid'   => $uuid,
                'erreur' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function existeEtablissementParId(int $id): bool
    {
        try {
            return DB::table('etablissements.etablissements')->where('id', $id)->exists();
        } catch (Throwable $e) {
            Log::error('[TENANT] Referentiel etablissements inaccessible.', [
                'id'     => $id,
                'erreur' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
