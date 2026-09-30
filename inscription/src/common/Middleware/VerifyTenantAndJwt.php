<?php

namespace App\common\Middleware;

use App\common\Responses\ApiResponse;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTenantAndJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Appel interne (Gateway API ou autre microservice autorise)
        $internalSecret = $request->header('X-Internal-Secret');
        $expectedSecret = env('INTERNAL_API_SECRET');

        if (!empty($internalSecret)) {
            if (empty($expectedSecret) || strlen($expectedSecret) < 8) {
                return ApiResponse::erreur('Secret interne non configure sur le serveur', 'CONFIG_SECURITE_INVALIDE', 500);
            }

            if (hash_equals($expectedSecret, $internalSecret)) {
                $tenantHeader = $request->header('X-Tenant-Id', $request->query('tenant_id'));
                if ($tenantHeader) {
                    app()->instance('current_tenant_id', (int) $tenantHeader);
                }
                return $next($request);
            }

            return ApiResponse::erreur('Secret interne invalide', 'ACCES_INTERNE_REFUSE', 403);
        }

        // 2. Exception metier : Soumission publique initiale d'une candidature
        // Seule la creation (POST /v1/candidatures) est ouverte au public (parent postulant sans compte)
        if ($request->is('*/candidatures') && $request->isMethod('post')) {
            $tenantHeader = $request->header('X-Tenant-Id', $request->input('tenant_id'));
            if ($tenantHeader) {
                app()->instance('current_tenant_id', (int) $tenantHeader);
                return $next($request);
            }
            return ApiResponse::erreur('Identifiant de l\'etablissement (tenant_id) obligatoire pour soumettre une candidature', 'TENANT_MANQUANT', 422);
        }

        // 3. Bearer Token JWT obligatoire pour toutes les autres routes
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return ApiResponse::erreur('Authentification requise. Jeton Bearer manquant.', 'NON_AUTHENTIFIE', 401);
        }

        $jwtToken = substr($authHeader, 7);
        $secret = env('JWT_ACCESS_SECRET');
        $algo = env('JWT_ALGO', 'HS256');

        if (empty($secret) || in_array($secret, self::INSECURE_PLACEHOLDERS, true)) {
            return ApiResponse::erreur('Configuration de signature JWT invalide sur le serveur', 'CONFIG_SECURITE_INVALIDE', 500);
        }

        try {
            $decoded = JWT::decode($jwtToken, new Key($secret, $algo));
            
            $tenantId = $decoded->tenant_id ?? $request->header('X-Tenant-Id');
            if (!$tenantId) {
                return ApiResponse::erreur('Identifiant de tenant introuvable dans le jeton', 'TENANT_MANQUANT', 403);
            }

            app()->instance('current_tenant_id', (int) $tenantId);
            app()->instance('current_user', (array) $decoded);
            $request->merge([
                'auth_user' => (array) $decoded,
                'current_tenant_id' => (int) $tenantId
            ]);

            return $next($request);
        } catch (\Exception $e) {
            return ApiResponse::erreur('Jeton d\'authentification invalide ou expire : ' . $e->getMessage(), 'JETON_INVALIDE', 401);
        }
    }
}
