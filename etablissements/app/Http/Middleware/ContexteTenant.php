<?php

namespace App\Http\Middleware;

use App\Domain\Etablissement\Etablissement;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contexte utilisateur transmis par la Gateway, APRES verification du JWT
 * d'api-identite (a utiliser derriere secret.interne) :
 *   X-User-Role   : doit valoir "administrateur"
 *   X-Tenant-Uuid : uuid de l'etablissement de l'utilisateur (tire du JWT, jamais du client)
 *
 * L'etablissement cible n'est jamais lu dans l'URL : un administrateur ne peut
 * donc agir que sur le sien.
 */
class ContexteTenant
{
    public const ROLE_ADMINISTRATEUR = 'administrateur';

    public function handle(Request $request, Closure $next): Response
    {
        $role = strtolower(trim((string) $request->header('X-User-Role')));

        if ($role !== self::ROLE_ADMINISTRATEUR) {
            return $this->refus(403, 'ROLE_ADMINISTRATEUR_REQUIS', "Action réservée à l'administrateur de l'établissement.");
        }

        $tenantUuid = trim((string) $request->header('X-Tenant-Uuid'));

        if (! Str::isUuid($tenantUuid)) {
            return $this->refus(403, 'TENANT_INVALIDE', "Contexte d'établissement absent ou invalide.");
        }

        $etablissement = Etablissement::where('uuid', $tenantUuid)->first();

        if (! $etablissement) {
            return $this->refus(404, 'ETABLISSEMENT_INTROUVABLE', 'Aucun établissement ne correspond à ce contexte.');
        }

        $request->attributes->set('etablissement', $etablissement);

        return $next($request);
    }

    private function refus(int $statut, string $code, string $message): Response
    {
        return response()->json(['success' => false, 'error' => ['code' => $code, 'message' => $message]], $statut);
    }
}
