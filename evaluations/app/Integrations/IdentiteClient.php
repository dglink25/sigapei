<?php

namespace App\Integrations;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Introspection du jeton d'accès émis par Identité (README plateforme, règle n°5, cas 2).
 *
 * Évaluations ne vérifie jamais la signature du JWT (JWT_ACCESS_SECRET reste chez Identité) :
 * il demande à Identité si le jeton est valide (signature, expiration, révocation, session).
 *   GET {IDENTITE_URL}/v1/interne/introspection?token=  + X-Internal-Secret
 *   => { valide: true, sub, tenantId, roleCode, familleAuth } | { valide: false, motif }
 *
 * Seules les réponses positives sont mises en cache (60 s, clé = empreinte SHA-256 du jeton,
 * jamais le jeton lui-même) : une révocation est donc prise en compte en 60 s au plus.
 * Identité injoignable ou réponse inattendue => exception => 503 (fail closed).
 */
class IdentiteClient
{
    /** @return array{sub: string, tenantId: ?string, roleCode: string}|null null si le jeton est refusé */
    public function introspecter(string $jeton): ?array
    {
        $cle = 'introspection:'.hash('sha256', $jeton);
        if (is_array($enCache = Cache::get($cle))) {
            return $enCache;
        }

        $url = rtrim((string) config('services.identite.url'), '/');
        $secret = (string) config('services.interne.secret', '');

        try {
            $reponse = Http::withHeaders(['X-Internal-Secret' => $secret, 'Accept' => 'application/json'])
                ->timeout((int) config('services.identite.timeout', 5))
                ->retry(2, 200, throw: false)
                ->get($url.'/v1/interne/introspection', ['token' => $jeton]);
        } catch (ConnectionException $e) {
            throw new ServiceIndisponibleException('Identité (introspection) injoignable.', previous: $e);
        }

        if (! $reponse->successful()) {
            throw new ServiceIndisponibleException('Identité (introspection) a répondu HTTP '.$reponse->status().'.');
        }

        $d = $reponse->json();
        if (! is_array($d) || ! array_key_exists('valide', $d)) {
            throw new ContratIncompletException('Réponse d\'introspection Identité inattendue (champ `valide` absent).');
        }
        if ($d['valide'] !== true) {
            return null;
        }
        if (! is_string($d['sub'] ?? null) || ! is_string($d['roleCode'] ?? null) || ! array_key_exists('tenantId', $d)) {
            throw new ContratIncompletException('Introspection Identité : sub, roleCode ou tenantId absent.');
        }

        $contexte = ['sub' => $d['sub'], 'tenantId' => $d['tenantId'] === null ? null : (string) $d['tenantId'], 'roleCode' => $d['roleCode']];
        Cache::put($cle, $contexte, (int) config('services.identite.cache_secondes', 60));

        return $contexte;
    }

    /**
     * L'utilisateur a-t-il accès au module ? (rôle autorisé ET service activé pour son établissement, catalogue
     * d'Identité) : GET /v1/interne/acces?utilisateurUuid=&serviceCode= => { autorise: bool }. Cache 60 s.
     */
    public function accesModule(string $utilisateurUuid): bool
    {
        return Cache::remember('acces-module:'.$utilisateurUuid, (int) config('services.identite.cache_secondes', 60), function () use ($utilisateurUuid) {
            $url = rtrim((string) config('services.identite.url'), '/');
            try {
                $reponse = Http::withHeaders(['X-Internal-Secret' => (string) config('services.interne.secret', ''), 'Accept' => 'application/json'])
                    ->timeout((int) config('services.identite.timeout', 5))
                    ->retry(2, 200, throw: false)
                    ->get($url.'/v1/interne/acces', [
                        'utilisateurUuid' => $utilisateurUuid,
                        'serviceCode' => (string) config('services.identite.code_service', 'evaluations'),
                    ]);
            } catch (ConnectionException $e) {
                throw new ServiceIndisponibleException('Identité (accès au module) injoignable.', previous: $e);
            }
            if (! $reponse->successful()) {
                throw new ServiceIndisponibleException('Identité (accès au module) a répondu HTTP '.$reponse->status().'.');
            }
            $autorise = $reponse->json('autorise');
            if (! is_bool($autorise)) {
                throw new ContratIncompletException('Accès Identité : champ `autorise` absent.');
            }

            return $autorise;
        });
    }
}
