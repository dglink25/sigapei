<?php

namespace App\common\Middleware;

use App\common\Responses\ApiResponse;
use App\common\Services\TenantResolver;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTenantAndJwt
{
    private const INSECURE_PLACEHOLDERS = [
        'change-me',
        'secret',
        'your-secret',
        'default-secret',
        'change-me-shared-secret-gateway',
    ];

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
                if (!$tenantHeader) {
                    return ApiResponse::erreur(
                        'En-tete X-Tenant-Id obligatoire pour un appel interne.',
                        'TENANT_MANQUANT',
                        403
                    );
                }

                // Même résolution UUID → entier que pour le chemin JWT, afin que
                // les appels internes et les appels utilisateur positent
                // exactement le même type dans le conteneur.
                try {
                    $tenantId = app(TenantResolver::class)->resoudre($tenantHeader);
                } catch (\Throwable $e) {
                    return ApiResponse::erreur(
                        'Etablissement de rattachement introuvable : ' . $e->getMessage(),
                        'TENANT_INVALIDE',
                        403
                    );
                }

                app()->instance('current_tenant_id', $tenantId);
                app()->instance('current_tenant_ref', $tenantHeader);

                // La passerelle transmet l'utilisateur connecté dans des
                // en-têtes dédiés (Règle n°5). Sans ce contexte, les
                // services qui lisent current_user (journalisation d'audit,
                // trace de l'auteur d'un transfert) levaient une erreur de
                // résolution du conteneur.
                $currentUser = [
                    'uuid'       => $request->header('X-User-Id'),
                    'sub'        => $request->header('X-User-Id'),
                    'roleCode'   => $request->header('X-User-Role'),
                    'tenant_ref' => $tenantHeader,
                ];
                app()->instance('current_user', $currentUser);
                $request->merge(['auth_user' => $currentUser]);

                return $next($request);
            }

            return ApiResponse::erreur('Secret interne invalide', 'ACCES_INTERNE_REFUSE', 403);
        }

        // 2. Bearer Token JWT obligatoire pour toutes les routes
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

            // Supporte les deux conventions de JWT (identite: tenantId / convention snake_case: tenant_id)
            $tenantRef = $decoded->tenantId ?? $decoded->tenant_id ?? $request->header('X-Tenant-Id');
            if (!$tenantRef) {
                return ApiResponse::erreur('Identifiant de tenant introuvable dans le jeton', 'TENANT_MANQUANT', 403);
            }

            // Le claim `tenantId` du microservice Identité est un UUID, alors que
            // les colonnes tenant_id du schéma scolarite sont des bigint. On
            // résout l'UUID vers l'entier interne AVANT de le publier dans le
            // conteneur : sans cela, le TenantScope injecte un WHERE tenant_id =
            // '<uuid>' sur une colonne bigint et PostgreSQL rejette la requête
            // (22P02) sur la totalité des endpoints.
            try {
                $tenantId = app(TenantResolver::class)->resoudre($tenantRef);
            } catch (\Throwable $e) {
                return ApiResponse::erreur(
                    'Etablissement de rattachement introuvable ou non autorise : ' . $e->getMessage(),
                    'TENANT_INVALIDE',
                    403
                );
            }

            $userData = (array) $decoded;
            // Normalisation pour compatibilité avec le reste de l'application
            $userData['roleCode'] = $userData['roleCode'] ?? $userData['role_code'] ?? $userData['role'] ?? null;
            $userData['uuid'] = $userData['sub'] ?? null;
            // Conservé pour les traces : la référence brute du jeton.
            $userData['tenant_ref'] = $tenantRef;

            app()->instance('current_tenant_id', $tenantId);
            app()->instance('current_tenant_ref', $tenantRef);
            app()->instance('current_user', $userData);
            $request->merge([
                'auth_user' => $userData,
                'current_tenant_id' => $tenantId
            ]);

            return $next($request);
        } catch (\Exception $e) {
            return ApiResponse::erreur('Jeton d\'authentification invalide ou expire : ' . $e->getMessage(), 'JETON_INVALIDE', 401);
        }
    }
}
