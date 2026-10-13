<?php

namespace App\Http\Middleware;

use App\Common\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CDC Finances §16 : vérification de l'authenticité de chaque webhook reçu.
 * Usage : ->middleware('webhook:fedapay') ou ->middleware('webhook:kkiapay').
 * Fail closed : secret absent, en-tête absent, signature invalide ou horodatage hors fenêtre => refus.
 *
 *  - FedaPay : en-tête X-FEDAPAY-SIGNATURE "t=<horodatage>,s=<hmac>",
 *              hmac = HMAC-SHA256("<t>.<corps brut>", FEDAPAY_WEBHOOK_SECRET).
 *  - KkiaPay : en-tête x-kkiapay-secret égal au secret configuré dans le tableau de bord KkiaPay.
 */
class VerifierSignatureWebhook
{
    public function handle(Request $request, Closure $next, string $fournisseur): Response
    {
        $valide = match ($fournisseur) {
            'fedapay' => $this->fedapay($request),
            'kkiapay' => $this->kkiapay($request),
            default   => false,
        };

        if (! $valide) {
            return ApiResponse::erreur('Signature invalide.', 'WEBHOOK_SIGNATURE_INVALIDE', 401, "Webhook {$fournisseur} rejeté");
        }

        return $next($request);
    }

    private function fedapay(Request $request): bool
    {
        $secret = (string) config('services.fedapay.webhook_secret', '');
        $entete = (string) $request->header('X-FEDAPAY-SIGNATURE', '');

        if ($secret === '' || $secret === 'change-me' || $entete === '') {
            return false;
        }

        $parties = [];
        foreach (explode(',', $entete) as $morceau) {
            [$cle, $valeur] = array_pad(explode('=', trim($morceau), 2), 2, '');
            $parties[$cle][] = $valeur;
        }

        $horodatage = $parties['t'][0] ?? '';
        if (! ctype_digit($horodatage) || abs(time() - (int) $horodatage) > (int) config('services.fedapay.tolerance', 300)) {
            return false;
        }

        $attendu = hash_hmac('sha256', $horodatage . '.' . $request->getContent(), $secret);

        foreach ($parties['s'] ?? [] as $signature) {
            if (hash_equals($attendu, $signature)) {
                return true;
            }
        }

        return false;
    }

    private function kkiapay(Request $request): bool
    {
        $secret = (string) config('services.kkiapay.secret', '');
        $recu   = (string) $request->header('x-kkiapay-secret', '');

        return $secret !== '' && $secret !== 'change-me' && $recu !== '' && hash_equals($secret, $recu);
    }
}
