<?php

namespace App\Integrations;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client HTTP des API internes des autres microservices.
 *
 * Regle n°1 : un microservice ne lit JAMAIS les tables d'un autre
 * microservice, meme si les deux partagent la meme base PostgreSQL.
 * Les donnees externes (apprenant, classe, cours, personnel) se
 * recuperent exclusivement par appel a l'API interne du microservice
 * concerne, en passant le secret interne partage dans l'entete
 * `X-Internal-Secret` (Regle n°3).
 *
 * Regle n°5 : ce client ne verifie aucun JWT. L'authentification de
 * l'appelant est assuree par le secret interne ; l'identite de
 * l'utilisateur, elle, vient des entetes transmis par la passerelle.
 */
class InterneClient
{
    /**
     * Appel GET sur l'API interne d'un microservice.
     *
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>|null null si la ressource est introuvable
     *
     * @throws RuntimeException si l'autre microservice est injoignable
     */
    public function get(string $microservice, string $chemin, array $query = []): ?array
    {
        $base = rtrim((string) config("services.microservices.urls.{$microservice}", ''), '/');
        if ($base === '') {
            throw new RuntimeException(
                "URL de base du microservice « {$microservice} » non configuree "
                .'(voir services.microservices.urls dans config/services.php).'
            );
        }

        try {
            $response = $this->envoyer($base, $chemin, ['query' => $query]);
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
                "Le microservice « {$microservice} » a repondu {$response->status()} sur GET {$chemin}."
            );
        }

        $donnees = $response->json();

        return is_array($donnees) ? $donnees : null;
    }

    private function envoyer(string $base, string $chemin, array $options): Response
    {
        return Http::withHeaders([
            (string) config('services.interne.header', 'X-Internal-Secret') => (string) config('services.interne.secret'),
            'Accept' => 'application/json',
        ])
            ->timeout((int) config('services.microservices.timeout', 5))
            ->acceptJson()
            ->get($base.'/'.ltrim($chemin, '/'), $options);
    }
}
