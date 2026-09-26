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
        // 1. Appel interne (Gateway ou autre microservice)
        $internalSecret = $request->header('X-Internal-Secret');
        $expectedSecret = env('INTERNAL_API_SECRET', 'change-me-shared-secret-gateway');

        if (!empty($internalSecret) && hash_equals($expectedSecret, $internalSecret)) {
            $tenantHeader = $request->header('X-Tenant-Id', $request->query('tenant_id'));
            if ($tenantHeader) {
                app()->instance('current_tenant_id', (int) $tenantHeader);
            }
            return $next($request);
        }

        // 2. Bearer Token JWT
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            // Soumission publique de candidature si parent sans compte prealable
            if ($request->is('*/candidatures') && $request->isMethod('post')) {
                $tenantHeader = $request->header('X-Tenant-Id', $request->input('tenant_id'));
                if ($tenantHeader) {
                    app()->instance('current_tenant_id', (int) $tenantHeader);
                    return $next($request);
                }
            }

            if (app()->environment('local', 'testing') && $request->hasHeader('X-Tenant-Id')) {
                app()->instance('current_tenant_id', (int) $request->header('X-Tenant-Id'));
                return $next($request);
            }

            return ApiResponse::erreur('Jeton d\'authentification manquant', 'NON_AUTHENTIFIE', 401);
        }

        $jwtToken = substr($authHeader, 7);
        $secret = env('JWT_ACCESS_SECRET', 'change-me-access-secret-min-32-chars');
        $algo = env('JWT_ALGO', 'HS256');

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
