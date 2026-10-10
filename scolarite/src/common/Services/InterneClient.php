<?php

namespace App\common\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client HTTP des API internes des autres microservices.
 *
 * Règle n°1 : un microservice ne lit JAMAIS les tables d'un autre
 * microservice, même si les deux partagent la même base PostgreSQL.
 * Les données externes se récupèrent exclusivement par appel à l'API
 * interne du microservice concerné, en passant le secret interne partagé
 * dans l'en-tête `X-Internal-Secret` (Règle n°3).
 *
 * Règle n°5 : ce client ne vérifie aucun JWT. L'authentification de
 * l'appelant est assurée par le secret interne ; l'identité de
 * l'utilisateur vient des en-têtes transmis par la passerelle.
 *
 * Implémentation alignée sur vie-scolaire/app/Integrations/InterneClient.php
 * pour garantir un contrat homogène sur toute la plateforme.
 */
class InterneClient
{
    /**
     * Appel GET sur l'API interne d'un microservice.
     *
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>|null null si la ressource est introuvable
     *
     * @throws RuntimeException si le microservice est injoignable
     */
    public function get(string $microservice, string $chemin, array $query = []): ?array
    {
        $base = rtrim((string) config("services.microservices.urls.{$microservice}", ''), '/');
        if ($base === '') {
            throw new RuntimeException(
                "URL de base du microservice « {$microservice} » non configurée "
                .'(voir services.microservices.urls dans config/services.php).'
            );
        }

        // Les paramètres sont passés à plat : `Http::get($url, $query)`.
        // Les encapsuler dans ['query' => $query] produisait une URL
        // `?query[id]=3` au lieu de `?id=3`, que le contrôleur cible
        // rejetait en 422 car il ne trouvait ni `uuid` ni `id`.
        try {
            $response = $this->envoyer($base, $chemin, $query);
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                "Microservice « {$microservice} » injoignable sur {$base} : {$exception->getMessage()}",
                previous: $exception
            );
        }

        if ($response->status() === 404) {
            return null;
        }

        if (! $response->successful()) {
            throw new RuntimeException(
                "Le microservice « {$microservice} » a répondu {$response->status()} sur GET {$chemin}."
            );
        }

        $donnees = $response->json();

        return is_array($donnees) ? $donnees : null;
    }

    /**
     * Appel POST sur l'API interne d'un microservice.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     *
     * @throws RuntimeException si le microservice est injoignable ou refuse
     */
    public function post(string $microservice, string $chemin, array $payload = []): array
    {
        $base = rtrim((string) config("services.microservices.urls.{$microservice}", ''), '/');
        if ($base === '') {
            throw new RuntimeException(
                "URL de base du microservice « {$microservice} » non configurée."
            );
        }

        try {
            $response = Http::withHeaders($this->entetes())
                ->timeout((int) config('services.microservices.timeout', 5))
                ->acceptJson()
                ->post($base.'/'.ltrim($chemin, '/'), $payload);
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                "Microservice « {$microservice} » injoignable sur {$base} : {$exception->getMessage()}",
                previous: $exception
            );
        }

        $donnees = $response->json();

        // Une erreur métier remontée par le microservice cible est
        // propagée telle quelle : le message est plus utile qu'un 500.
        if (! $response->successful()) {
            $message = is_array($donnees)
                ? ($donnees['message'] ?? $donnees['erreur'] ?? null)
                : null;

            throw new RuntimeException(
                $message ?: "Le microservice « {$microservice} » a répondu {$response->status()} sur POST {$chemin}."
            );
        }

        return is_array($donnees) ? $donnees : [];
    }

    private function envoyer(string $base, string $chemin, array $query = []): Response
    {
        return Http::withHeaders($this->entetes())
            ->timeout((int) config('services.microservices.timeout', 5))
            ->acceptJson()
            ->get($base.'/'.ltrim($chemin, '/'), $query);
    }

    /**
     * En-têtes communs à tous les appels internes.
     *
     * `X-Tenant-Id` est indispensable : sans lui, le middleware du
     * microservice cible répond 403 TENANT_MANQUANT car il ne peut pas
     *cloisonner la requête sur un établissement. On transmet le tenant
     * courant s'il est déjà résolu, sinon la référence brute du jeton.
     *
     * `X-User-Id` et `X-User-Role` relayent le contexte utilisateur pour
     * que la cible puisse journaliser l'auteur de l'action.
     *
     * @return array<string, string>
     */
    private function entetes(): array
    {
        $entetes = [
            (string) config('services.interne.header', 'X-Internal-Secret') => (string) config('services.interne.secret'),
            'Accept' => 'application/json',
        ];

        $tenant = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if ($tenant === null && app()->bound('current_tenant_ref')) {
            $tenant = app('current_tenant_ref');
        }
        if ($tenant !== null && $tenant !== '') {
            $entetes['X-Tenant-Id'] = (string) $tenant;
        }

        if (app()->bound('current_user')) {
            $user = app('current_user');
            $uuid = $user['uuid'] ?? $user['sub'] ?? null;
            if (!empty($uuid)) {
                $entetes['X-User-Id'] = (string) $uuid;
            }
            $role = $user['roleCode'] ?? $user['role_code'] ?? null;
            if (!empty($role)) {
                $entetes['X-User-Role'] = (string) $role;
            }
        }

        return $entetes;
    }
}
