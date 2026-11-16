<?php

namespace App\Common\Middleware;

use App\Common\Responses\ApiResponse;
use App\Integrations\IdentiteClient;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Qui appelle ? Les deux voies du README plateforme (règle n°5), jamais une troisième.
 *
 * 1. Front, appel direct : Authorization: Bearer <jeton Identité>, vérifié PAR Identité (introspection) ;
 *    utilisateur, rôle et établissement viennent uniquement de la réponse d'Identité.
 * 2. Gateway : X-Internal-Secret + X-Tenant-Id (uuid de l'établissement) + X-User-Id + X-User-Role.
 *    Sans secret valide, ces en-têtes ne valent rien.
 *
 * Puis : l'utilisateur doit avoir accès au module dans Identité (rôle autorisé, service activé pour son
 * établissement). Tout rôle est admis, y compris personnalisé (« comptable ») : ce qu'il peut gérer est décidé
 * par la grille de l'établissement. Le super administrateur n'a accès à aucune donnée d'un établissement.
 * Toute anomalie => refus ; dépendance injoignable => 503.
 */
class VerifyTenantAndJwt
{
    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    private const UUID_LARGE = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

    private const CODE_ROLE = '/^[a-z][a-z0-9_-]{1,63}$/';

    public function __construct(private readonly IdentiteClient $identite) {}

    public function handle(Request $request, Closure $next): Response
    {
        $attendu = (string) config('services.interne.secret', '');
        if (strlen($attendu) < 32) {
            return ApiResponse::erreur('Service momentanément indisponible.', 'CONFIG_SECURITE_INVALIDE', 503, 'INTERNAL_API_SECRET absent ou trop court (32 caractères minimum)');
        }

        $secret = (string) $request->header((string) config('services.interne.header', 'X-Internal-Secret'), '');
        if ($secret !== '') {
            if (! hash_equals($attendu, $secret)) {
                return ApiResponse::erreur('Accès refusé.', 'APPEL_NON_AUTORISE', 401, 'Secret interne invalide');
            }
            $etab = (string) $request->header('X-Tenant-Id', '');
            $uuid = (string) $request->header('X-User-Id', '');
            $role = (string) $request->header('X-User-Role', '');
        } else {
            $jeton = (string) $request->bearerToken();
            if ($jeton === '' || strlen($jeton) > 4096) {
                return ApiResponse::erreur('Vous devez être connecté pour accéder à cette ressource.', 'APPEL_NON_AUTORISE', 401);
            }
            $ctx = $this->identite->introspecter($jeton);
            if ($ctx === null) {
                return ApiResponse::erreur('Session invalide ou expirée. Reconnectez-vous.', 'JETON_INVALIDE', 401);
            }
            [$etab, $uuid, $role] = [(string) $ctx['tenantId'], $ctx['sub'], $ctx['roleCode']];
        }

        $uuid = strtolower($uuid);
        if (! preg_match(self::UUID, $uuid)) {
            return ApiResponse::erreur('Vous devez être connecté pour accéder à cette ressource.', 'NON_AUTHENTIFIE', 401);
        }
        if (! preg_match(self::CODE_ROLE, $role) || $role === 'super_admin') {
            return ApiResponse::erreur('Votre compte ne dispose pas d\'un rôle autorisé dans ce module.', 'ROLE_INVALIDE', 403);
        }
        if (! preg_match(self::UUID_LARGE, $etab)) {
            return ApiResponse::erreur('Contexte établissement manquant ou invalide.', 'TENANT_MANQUANT', 401);
        }
        if (! $this->identite->accesModule($uuid)) {
            return ApiResponse::erreur('Ce service n\'est pas ouvert à votre profil dans votre établissement.', 'MODULE_NON_AUTORISE', 403);
        }

        $etab = strtolower($etab);
        app()->instance('current_etablissement', $etab);
        app()->instance('current_user', ['uuid' => $uuid, 'roleCode' => $role, 'etablissement' => $etab]);

        return $next($request);
    }
}
