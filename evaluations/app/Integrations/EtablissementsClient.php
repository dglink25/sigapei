<?php

namespace App\Integrations;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Correspondance uuid de l'établissement (Identité, front, E-learning) -> identifiant numérique
 * tenant_id (convention des tables Laravel de la plateforme : Scolarité, RH, Vie scolaire, Évaluations).
 *
 * Même contrat que le TenantResolver de Scolarité :
 *   GET {ETABLISSEMENTS_URL}/v1/interne/etablissements?uuid=  + X-Internal-Secret
 *   => l'établissement avec son `id` (à la racine, sous `donnees` ou sous `data`).
 * L'uuid renvoyé est recontrôlé (un filtre ignoré côté serveur ne doit pas désigner un autre établissement).
 *
 * La correspondance ne change jamais : elle est mise en cache 10 minutes.
 * Établissements injoignable ou `id` non fourni => exception => 503, jamais un tenant deviné.
 */
class EtablissementsClient
{
    public function idDepuisUuid(string $uuid): ?int
    {
        $uuid = strtolower($uuid);

        return Cache::remember('tenant-id:'.$uuid, 600, function () use ($uuid) {
            $url = rtrim((string) config('services.etablissements.url'), '/');

            try {
                $reponse = Http::withHeaders([
                    'X-Internal-Secret' => (string) config('services.interne.secret', ''),
                    'Accept' => 'application/json',
                ])
                    ->timeout((int) config('services.etablissements.timeout', 5))
                    ->retry(2, 200, throw: false)
                    ->get($url.'/v1/interne/etablissements', ['uuid' => $uuid]);
            } catch (ConnectionException $e) {
                throw new ServiceIndisponibleException('Établissements injoignable.', previous: $e);
            }

            if ($reponse->status() === 404) {
                return null;
            }
            if (! $reponse->successful()) {
                throw new ServiceIndisponibleException('Établissements a répondu HTTP '.$reponse->status().'.');
            }

            $corps = $reponse->json();
            $e = $corps['donnees'] ?? $corps['data'] ?? $corps;
            if (is_array($e) && array_is_list($e)) {
                $e = $e[0] ?? null; // filtre appliqué : liste d'un seul établissement
            }
            if ($e === null) {
                return null;
            }
            if (! is_array($e) || ! isset($e['id'], $e['uuid'])) {
                throw new ContratIncompletException('Établissements ne fournit pas `id` et `uuid` sur /v1/interne/etablissements?uuid=.');
            }
            if (strtolower((string) $e['uuid']) !== $uuid) {
                throw new ContratIncompletException('Établissements a ignoré le filtre uuid (établissement renvoyé différent).');
            }

            return ctype_digit((string) $e['id']) && (int) $e['id'] > 0 ? (int) $e['id'] : throw new ContratIncompletException('Identifiant d\'établissement invalide.');
        });
    }
}
