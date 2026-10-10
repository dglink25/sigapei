<?php

namespace App\common\Middleware;

use App\common\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de vérification des rôles identite.
 *
 * Ce middleware est toujours posé APRÈS VerifyTenantAndJwt (qui décode le JWT
 * et injecte current_user dans le container). Il lit le champ `roleCode` du
 * payload JWT tel qu'il est signé par api-identite et refuse l'accès si le
 * rôle de l'utilisateur ne figure pas dans la liste autorisée.
 *
 * Rôles système définis dans identite/src/roles/role.entity.ts :
 *   super_admin | administrateur | personnel | enseignant | apprenant | parent
 */
class VerifyRole
{
    /**
     * @param  string[]  $roles  Rôles autorisés à accéder à cette route
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Appel interne (passerelle ou autre microservice) : l'authentification
        // repose sur le secret interne, déjà validé par VerifyTenantAndJwt.
        // Aucun rôle applicatif n'est disponible, et il ne doit pas l'être :
        // ces routes ne portent pas de contrôle RBAC.
        if ($request->header('X-Internal-Secret')) {
            return $next($request);
        }

        if (!app()->bound('current_user')) {
            return ApiResponse::erreur(
                'Contexte utilisateur manquant — JWT non vérifié en amont.',
                'NON_AUTHENTIFIE',
                401
            );
        }

        $user = app('current_user');

        if (empty($user)) {
            return ApiResponse::erreur(
                'Contexte utilisateur manquant — JWT non vérifié en amont.',
                'NON_AUTHENTIFIE',
                401
            );
        }

        // Le payload JWT d'identite utilise la clé `roleCode`
        $roleCode = $user['roleCode'] ?? $user['role_code'] ?? null;

        if (!$roleCode) {
            return ApiResponse::erreur(
                'Rôle utilisateur introuvable dans le jeton.',
                'ROLE_MANQUANT',
                403
            );
        }

        // super_admin a accès à tout, partout
        if ($roleCode === 'super_admin') {
            return $next($request);
        }

        if (!in_array($roleCode, $roles, true)) {
            return ApiResponse::erreur(
                "Accès refusé. Rôle requis : " . implode(', ', $roles) . ". Rôle actuel : {$roleCode}.",
                'ACCES_REFUSE',
                403
            );
        }

        return $next($request);
    }
}
