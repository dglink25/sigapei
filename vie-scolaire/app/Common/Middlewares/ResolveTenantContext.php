<?php

namespace App\Common\Middlewares;

use App\Common\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Résout le contexte tenant depuis les claims transmis par la passerelle API.
 *
 * La passerelle (Gateway) a déjà vérifié le JWT émis par le microservice
 * Identité ainsi que le statut du tenant (section 10 du CDC) ; elle transmet
 * ensuite les claims au microservice via des entêtes standardisés :
 *  - X-Tenant-Id : identifiant numérique du tenant ;
 *  - X-User-Id  : uuid de l'utilisateur connecté (claim sub) ;
 *  - X-User-Role: rôle de l'utilisateur sur ce module.
 */
class ResolveTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->header('X-Tenant-Id');
        $userId = $request->header('X-User-Id');
        $role = (string) $request->header('X-User-Role', '');

        if (! $tenantId || ! ctype_digit((string) $tenantId)) {
            return response()->json([
                'message' => 'Contexte tenant manquant ou invalide.',
            ], 401);
        }

        app()->instance(
            TenantContext::class,
            new TenantContext((int) $tenantId, $userId, $role)
        );

        return $next($request);
    }
}
