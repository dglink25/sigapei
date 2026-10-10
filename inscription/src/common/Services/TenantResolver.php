<?php

namespace App\common\Services;

use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Résolution du tenant (établissement) au format attendu par Scolarité.
 *
 * PROBLÈME ARCHITECTURAL
 * ---------------------
 * Le JWT émis par Identité porte un claim `tenantId` qui est un **uuid**,
 * alors que les colonnes `tenant_id` des schémas `scolarite` et
 * `inscription` sont des **bigint**. Comparer les deux fait échouer
 * PostgreSQL (22P02) sur toutes les requêtes Eloquent.
 *
 * Ce service fait le pont entre les deux représentations. Conformément à la
 * règle n°1, la résolution ne se fait PAS par jointure SQL : elle passe par
 * l'API interne du microservice Établissements (`/interne/...` +
 * `X-Internal-Secret`).
 *
 * CONVENTION TENANT
 * -----------------
 * Deux conventions coexistent aujourd'hui sur la plateforme :
 *   - vie-scolaire impose un `X-Tenant-Id` numérique (ctype_digit) ;
 *   - le JWT Identité porte un `tenantId` en uuid.
 * `TWO_TENANT_CONVENTIONS_ENABLED` permet d'accepter un entier sans
 * appel réseau, ce qui rend les deux services compatibles. Le jour où la
 * plateforme alignera tout sur une seule convention, ce drapeau doit être
 * retiré.
 *
 * @var array<string, int|null> Cache de résolution pour la durée de la requête.
 */
class TenantResolver
{
    private array $cache = [];

    public function __construct(
        protected InterneClient $interne
    ) {}

    /**
     * Résout une référence de tenant (uuid ou entier) vers l'entier interne.
     *
     * @throws RuntimeException si la référence est absente ou inconnue.
     */
    public function resoudre(string|int|null $tenantRef): int
    {
        if ($tenantRef === null || $tenantRef === '') {
            throw new RuntimeException(
                "Tenant introuvable dans le contexte d'authentification."
            );
        }

        $cle = is_numeric($tenantRef) ? 'i:' . $tenantRef : 'u:' . $tenantRef;

        if (array_key_exists($cle, $this->cache)) {
            $resolu = $this->cache[$cle];
            if ($resolu === null) {
                throw new RuntimeException("Tenant inconnu du référentiel : {$tenantRef}.");
            }
            return $resolu;
        }

        // Un entier est déjà l'identifiant interne. En mode compatibilité
        // (convention numérique déjà appliquée par la passerelle), on
        // l'accepte sans appel réseau — c'est le cas de vie-scolaire.
        if (is_numeric($tenantRef)) {
            if (config('app.two_tenant_conventions_enabled', false)) {
                $this->cache[$cle] = (int) $tenantRef;
                return (int) $tenantRef;
            }

            $existe = $this->existeEtablissementParId((int) $tenantRef);
            $this->cache[$cle] = $existe ? (int) $tenantRef : null;

            if (!$existe) {
                throw new RuntimeException("Tenant inconnu du référentiel : {$tenantRef}.");
            }

            return (int) $tenantRef;
        }

        $id = $this->resoudreUuidVersId((string) $tenantRef);
        $this->cache[$cle] = $id;

        if ($id === null) {
            throw new RuntimeException(
                "Tenant {$tenantRef} absent du microservice Établissements."
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
        } catch (Throwable) {
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
            $reponse = $this->interne->get('etablissements', '/v1/interne/etablissements', ['uuid' => $uuid]);
        } catch (Throwable $e) {
            Log::error('[TENANT] Microservice Établissements injoignable.', [
                'uuid'   => $uuid,
                'erreur' => $e->getMessage(),
            ]);
            return null;
        }

        if (!$reponse) {
            return null;
        }

        $donnees = $reponse['donnees'] ?? $reponse;

        return isset($donnees['id']) ? (int) $donnees['id'] : null;
    }

    private function existeEtablissementParId(int $id): bool
    {
        try {
            $reponse = $this->interne->get('etablissements', '/v1/interne/etablissements', ['id' => $id]);
        } catch (Throwable $e) {
            Log::error('[TENANT] Microservice Établissements injoignable.', [
                'id'     => $id,
                'erreur' => $e->getMessage(),
            ]);
            return false;
        }

        if (!$reponse) {
            return false;
        }

        $donnees = $reponse['donnees'] ?? $reponse;

        return isset($donnees['id']);
    }
}
