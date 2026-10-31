<?php

namespace App\Integrations;

use Illuminate\Support\Facades\Cache;

/**
 * Identité (règle n°5, cas 2 : appel direct du front, sans Gateway).
 *  - introspection : le jeton est vérifié PAR Identité (signature, expiration, révocation, session) ;
 *  - accès au module : rôle autorisé ET service activé pour l'établissement (catalogue d'Identité).
 * Cache : jeton valide 60 s, jeton refusé 10 s, accès 60 s (clé = empreinte SHA-256, jamais le jeton).
 */
class IdentiteClient
{
    public function __construct(private readonly ClientInterne $http) {}

    /** @return array{sub: string, tenantId: ?string, roleCode: string}|null */
    public function introspecter(string $jeton): ?array
    {
        $cle = 'introspection:'.hash('sha256', $jeton);
        $enCache = Cache::get($cle);
        if ($enCache !== null) {
            return $enCache === false ? null : $enCache;
        }

        $d = $this->http->get('identite', '/v1/interne/introspection', ['token' => $jeton]);
        if (! is_array($d) || ! array_key_exists('valide', $d)) {
            throw new ContratIncompletException('Introspection Identité : champ `valide` absent.');
        }
        if ($d['valide'] !== true) {
            Cache::put($cle, false, 10);

            return null;
        }
        if (! is_string($d['sub'] ?? null) || ! is_string($d['roleCode'] ?? null) || ! array_key_exists('tenantId', $d)) {
            throw new ContratIncompletException('Introspection Identité : sub, roleCode ou tenantId absent.');
        }

        $contexte = ['sub' => $d['sub'], 'tenantId' => $d['tenantId'] === null ? null : (string) $d['tenantId'], 'roleCode' => $d['roleCode']];
        Cache::put($cle, $contexte, 60);

        return $contexte;
    }

    public function accesModule(string $utilisateurUuid): bool
    {
        return Cache::remember('acces-module:'.$utilisateurUuid, 60, function () use ($utilisateurUuid) {
            $d = $this->http->get('identite', '/v1/interne/acces', [
                'utilisateurUuid' => $utilisateurUuid,
                'serviceCode' => (string) config('services.identite.code_service', 'finances'),
            ]);
            if (! is_array($d) || ! is_bool($d['autorise'] ?? null)) {
                throw new ContratIncompletException('Accès Identité : champ `autorise` absent.');
            }

            return $d['autorise'];
        });
    }
}
