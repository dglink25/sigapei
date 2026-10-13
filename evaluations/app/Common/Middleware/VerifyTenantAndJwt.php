<?php

namespace App\Common\Middleware;

use App\Common\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contexte utilisateur/tenant transmis par la Gateway (README plateforme, règles n°3 et n°5).
 *
 * La Gateway a déjà validé le JWT émis par `identite` et transmet le contexte dans des
 * en-têtes internes. Ce microservice ne vérifie jamais le JWT lui-même et ne connaît pas
 * JWT_ACCESS_SECRET.
 *
 * Sécurité : de simples en-têtes sont falsifiables par n'importe quel conteneur du réseau.
 * Ils ne sont donc acceptés QUE s'ils sont accompagnés du secret interne partagé
 * (X-Internal-Secret), qui prouve que l'appel vient de la Gateway ou d'un service de
 * la plateforme. Toute anomalie => refus (fail closed).
 *
 * En-têtes obligatoires :
 *  - X-Internal-Secret : INTERNAL_API_SECRET (comparaison en temps constant) ;
 *  - X-Tenant-Id       : identifiant numérique du tenant ;
 *  - X-User-Id         : uuid de l'utilisateur connecté (claim sub) ;
 *  - X-User-Role       : code du rôle (liste fermée).
 */
class VerifyTenantAndJwt
{
    public const ROLES = ['super_admin', 'administrateur', 'personnel', 'enseignant', 'apprenant', 'parent'];

    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    public function handle(Request $request, Closure $next): Response
    {
        $attendu = (string) config('services.interne.secret', '');
        $header = (string) config('services.interne.header', 'X-Internal-Secret');

        if (strlen($attendu) < 32) {
            return ApiResponse::erreur(
                'Service momentanément indisponible.',
                'CONFIG_SECURITE_INVALIDE',
                503,
                'INTERNAL_API_SECRET absent ou trop court (32 caractères minimum)'
            );
        }

        $recu = (string) $request->header($header, '');
        if ($recu === '' || ! hash_equals($attendu, $recu)) {
            return ApiResponse::erreur(
                'Accès refusé.',
                'APPEL_NON_AUTORISE',
                401,
                'Appel direct sans secret interne valide (la Gateway est obligatoire)'
            );
        }

        $tenantId = (string) $request->header('X-Tenant-Id', '');
        $userId = strtolower((string) $request->header('X-User-Id', ''));
        $role = (string) $request->header('X-User-Role', '');

        if ($tenantId === '' || ! ctype_digit($tenantId) || (int) $tenantId < 1 || strlen($tenantId) > 18) {
            return ApiResponse::erreur('Contexte établissement manquant ou invalide.', 'TENANT_MANQUANT', 401);
        }

        if (! preg_match(self::UUID, $userId)) {
            return ApiResponse::erreur('Vous devez être connecté pour accéder à cette ressource.', 'NON_AUTHENTIFIE', 401);
        }

        if (! in_array($role, self::ROLES, true)) {
            return ApiResponse::erreur(
                'Votre compte ne dispose pas d\'un rôle valide.',
                'ROLE_INVALIDE',
                403,
                'X-User-Role absent ou hors liste'
            );
        }

        app()->instance('current_tenant_id', (int) $tenantId);
        app()->instance('current_user', [
            'uuid' => $userId,
            'roleCode' => $role,
            'tenantId' => (int) $tenantId,
        ]);

        return $next($request);
    }
}
