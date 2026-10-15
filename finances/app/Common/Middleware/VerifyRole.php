<?php

namespace App\Common\Middleware;

use App\Common\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérification des rôles — CDC Finances, Tableau 1.
 * Toujours posé APRÈS VerifyTenantAndJwt.
 *
 * Rôles plateforme : super_admin | administrateur | personnel | enseignant | apprenant | parent
 */
class VerifyRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = app('current_user');

        if (empty($user)) {
            return ApiResponse::erreur(
                'Vous devez être connecté pour effectuer cette action.',
                'NON_AUTHENTIFIE',
                401,
                'current_user absent du container — VerifyTenantAndJwt non appliqué en amont'
            );
        }

        $roleCode = $user['roleCode'] ?? $user['role_code'] ?? null;

        if (! $roleCode) {
            return ApiResponse::erreur(
                'Votre compte ne dispose pas d\'un rôle valide. Contactez votre administrateur.',
                'ROLE_MANQUANT',
                403,
                'roleCode introuvable dans le payload JWT'
            );
        }

        // Aucun accès universel : le Super Administrateur n'a accès à AUCUNE transaction
        // interne d'un établissement (CDC Tableau 1). Il n'est autorisé que sur
        // les routes qui le listent explicitement.

        if (! in_array($roleCode, $roles, true)) {
            return ApiResponse::erreur(
                'Vous n\'avez pas les droits nécessaires pour effectuer cette action.',
                'ACCES_REFUSE',
                403,
                'Rôle requis : '.implode(', ', $roles).". Rôle actuel : {$roleCode}"
            );
        }

        return $next($request);
    }
}
