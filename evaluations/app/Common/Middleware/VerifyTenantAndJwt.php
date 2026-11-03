<?php

namespace App\Common\Middleware;

use App\Common\Responses\ApiResponse;
use App\Common\Tenant\ResolutionTenant;
use App\Integrations\IdentiteClient;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Qui appelle ? Les deux voies autorisées par le README plateforme (règle n°5), jamais une troisième.
 *
 * 1. Via la Gateway : elle a validé le JWT et transmet le contexte dans des en-têtes. De simples
 *    en-têtes sont falsifiables par n'importe quel conteneur du réseau : ils ne sont acceptés
 *    QU'AVEC le secret interne (X-Internal-Secret, comparaison en temps constant).
 *      X-Internal-Secret, X-Tenant-Id (identifiant ou uuid de l'établissement), X-User-Id (uuid), X-User-Role
 *
 * 2. Appel direct du front (aucune Gateway) : Authorization: Bearer <jeton d'accès Identité>.
 *    Le jeton est vérifié PAR Identité (introspection : signature, expiration, révocation, session) ;
 *    Évaluations ne connaît pas JWT_ACCESS_SECRET. Le contexte vient uniquement de la réponse
 *    d'Identité, jamais d'en-têtes envoyés par le navigateur.
 *
 * Toute anomalie => refus ; dépendance injoignable => 503 (fail closed).
 */
class VerifyTenantAndJwt
{
    public const ROLES = ['super_admin', 'administrateur', 'personnel', 'enseignant', 'apprenant', 'parent'];

    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    public function __construct(
        private readonly ResolutionTenant $tenants,
        private readonly IdentiteClient $identite,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $attendu = (string) config('services.interne.secret', '');
        if (strlen($attendu) < 32) {
            return ApiResponse::erreur(
                'Service momentanément indisponible.',
                'CONFIG_SECURITE_INVALIDE',
                503,
                'INTERNAL_API_SECRET absent ou trop court (32 caractères minimum)'
            );
        }

        $secretRecu = (string) $request->header((string) config('services.interne.header', 'X-Internal-Secret'), '');

        if ($secretRecu !== '') {
            if (! hash_equals($attendu, $secretRecu)) {
                return ApiResponse::erreur('Accès refusé.', 'APPEL_NON_AUTORISE', 401, 'Secret interne invalide');
            }

            return $this->poserContexte(
                $request, $next,
                (string) $request->header('X-Tenant-Id', ''),
                strtolower((string) $request->header('X-User-Id', '')),
                (string) $request->header('X-User-Role', ''),
            );
        }

        $jeton = (string) $request->bearerToken();
        if ($jeton === '') {
            return ApiResponse::erreur('Vous devez être connecté pour accéder à cette ressource.', 'APPEL_NON_AUTORISE', 401, 'Ni secret interne (Gateway) ni jeton Bearer');
        }
        if (strlen($jeton) > 4096) {
            return ApiResponse::erreur('Session invalide ou expirée.', 'JETON_INVALIDE', 401);
        }

        $contexte = $this->identite->introspecter($jeton);
        if ($contexte === null) {
            return ApiResponse::erreur('Session invalide ou expirée. Reconnectez-vous.', 'JETON_INVALIDE', 401);
        }

        return $this->poserContexte($request, $next, (string) $contexte['tenantId'], strtolower($contexte['sub']), $contexte['roleCode']);
    }

    private function poserContexte(Request $request, Closure $next, string $tenantRef, string $userId, string $role): Response
    {
        if (! preg_match(self::UUID, $userId)) {
            return ApiResponse::erreur('Vous devez être connecté pour accéder à cette ressource.', 'NON_AUTHENTIFIE', 401);
        }
        if (! in_array($role, self::ROLES, true)) {
            return ApiResponse::erreur('Votre compte ne dispose pas d\'un rôle autorisé dans ce module.', 'ROLE_INVALIDE', 403, 'Rôle hors liste des rôles système');
        }

        $tenantId = $this->tenants->resoudre($tenantRef);
        if ($tenantId === null) {
            return ApiResponse::erreur('Contexte établissement manquant ou invalide.', 'TENANT_MANQUANT', 401);
        }
        if (! $this->identite->accesModule($userId)) {
            return ApiResponse::erreur('Ce service n\'est pas ouvert à votre profil dans votre établissement.', 'MODULE_NON_AUTORISE', 403);
        }

        app()->instance('current_tenant_id', $tenantId);
        app()->instance('current_user', ['uuid' => $userId, 'roleCode' => $role, 'tenantId' => $tenantId]);

        return $next($request);
    }
}
