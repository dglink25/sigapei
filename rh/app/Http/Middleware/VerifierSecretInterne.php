<?php

namespace App\Http\Middleware;

use App\Common\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Règle n°3 de la plateforme : les endpoints /interne/* ne sont appelés que par la Gateway
 * ou par un autre microservice. Ils sont protégés par INTERNAL_API_SECRET, identique sur toute
 * la plateforme et transmis dans l'en-tête X-Internal-Secret (comparaison en temps constant).
 * La valeur ne doit jamais être générée localement.
 */
class VerifierSecretInterne
{
    public function handle(Request $request, Closure $next): Response
    {
        $attendu = (string) config('services.interne.secret', '');
        $header = (string) config('services.interne.header', 'X-Internal-Secret');

        if ($attendu === '') {
            return ApiResponse::erreur(
                'Endpoint interne indisponible.',
                'CONFIG_SECURITE_INVALIDE',
                403,
                'INTERNAL_API_SECRET absent de la configuration'
            );
        }

        $recu = (string) $request->header($header, '');

        if ($recu === '' || ! hash_equals($attendu, $recu)) {
            return ApiResponse::erreur(
                'Accès réservé aux services internes de la plateforme.',
                'SECRET_INTERNE_INVALIDE',
                403
            );
        }

        return $next($request);
    }
}
