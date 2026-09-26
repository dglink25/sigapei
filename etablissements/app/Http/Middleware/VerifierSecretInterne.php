<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protege les endpoints /interne/* : reserves a la passerelle API (Gateway)
 * et au back-office Super Administrateur, jamais appeles directement par un
 * client final. Authentification par secret partage (header X-Internal-Secret),
 * identique au mecanisme utilise par api-identite.
 */
class VerifierSecretInterne
{
    public function handle(Request $request, Closure $next): Response
    {
        $attendu = env('INTERNAL_API_SECRET');
        $recu = $request->header('X-Internal-Secret');

        if (! $attendu || $recu !== $attendu) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SECRET_INTERNE_INVALIDE',
                    'message' => 'Acces reserve aux services internes de la plateforme.',
                ],
            ], 401);
        }

        return $next($request);
    }
}
