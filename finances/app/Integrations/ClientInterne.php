<?php

namespace App\Integrations;

use App\Exceptions\MetierException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Appels /v1/interne/* vers les autres microservices (règle n°1 : jamais de jointure SQL ; règle n°3 :
 * X-Internal-Secret). Timeout court, 2 nouvelles tentatives sur erreur réseau uniquement (jamais sur un
 * POST : l'idempotence est portée par la clé envoyée). Indisponibilité => ServiceIndisponibleException (503).
 */
class ClientInterne
{
    public function get(string $service, string $chemin, array $query = [], ?string $etablissement = null): ?array
    {
        return $this->traiter($service, $chemin, fn ($http, $url) => $http->retry(2, 200, throw: false)->get($url, $query), $etablissement);
    }

    /**
     * @param  bool  $refusMetier  un refus 4xx du service appelé (accord absent, paiements suspendus...) est rendu
     *                             à l'utilisateur avec son message (409) au lieu d'une indisponibilité (503).
     */
    public function post(string $service, string $chemin, array $corps, ?string $etablissement = null, array $entetes = [], bool $refusMetier = false): ?array
    {
        return $this->traiter($service, $chemin, fn ($http, $url) => $http->withHeaders($entetes)->post($url, $corps), $etablissement, $refusMetier);
    }

    private function traiter(string $service, string $chemin, callable $appel, ?string $etablissement, bool $refusMetier = false): ?array
    {
        $base = rtrim((string) config("services.{$service}.url"), '/');
        $secret = (string) config('services.interne.secret', '');
        if ($base === '' || strlen($secret) < 32) {
            throw new ServiceIndisponibleException("Configuration incomplète pour {$service}.");
        }

        $entetes = ['X-Internal-Secret' => $secret, 'Accept' => 'application/json'];
        if ($etablissement !== null) {
            $entetes['X-Tenant-Id'] = $etablissement;
        }

        try {
            /** @var Response $r */
            $r = $appel(Http::withHeaders($entetes)->timeout((int) config("services.{$service}.timeout", 5)), $base.$chemin);
        } catch (ConnectionException $e) {
            throw new ServiceIndisponibleException("{$service} injoignable ({$chemin}).", previous: $e);
        }

        if ($r->status() === 404) {
            return null;
        }
        if ($refusMetier && $r->clientError()) {
            $message = $r->json('error.message') ?? $r->json('message');
            $code = $r->json('error.code') ?? $r->json('code');
            throw MetierException::conflit(
                is_string($message) && $message !== '' ? mb_substr($message, 0, 300) : 'Le service de paiement a refusé la demande.',
                is_string($code) && preg_match('/^[A-Z_]{2,60}$/', $code) === 1 ? $code : 'PAIEMENT_REFUSE',
            );
        }
        if (! $r->successful()) {
            throw new ServiceIndisponibleException("{$service} a répondu HTTP {$r->status()} ({$chemin}).");
        }

        $json = $r->json();

        return is_array($json) ? $json : throw new ContratIncompletException("{$service} : réponse non JSON ({$chemin}).");
    }

    /** Charge utile quelle que soit l'enveloppe ({donnees}, {data} ou racine). */
    public static function charge(?array $corps): mixed
    {
        if ($corps === null) {
            return null;
        }

        return array_key_exists('donnees', $corps) ? $corps['donnees'] : (array_key_exists('data', $corps) ? $corps['data'] : $corps);
    }
}
