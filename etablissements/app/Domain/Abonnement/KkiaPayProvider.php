<?php

namespace App\Domain\Abonnement;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Integration KkiaPay pour le paiement des abonnements (section 9).
 *
 * KkiaPay fonctionne principalement via un widget cote client (cle
 * publique) qui retourne un transactionId ; ce provider se charge
 * uniquement de la VERIFICATION serveur de ce transactionId, seule etape
 * de confiance (ne jamais activer un abonnement sur la seule foi du
 * callback client). Verifie les endpoints exacts dans la documentation
 * officielle (https://docs.kkiapay.me) avant mise en production.
 */
class KkiaPayProvider
{
    private function client()
    {
        $base = env('KKIAPAY_SANDBOX', true) === true || env('KKIAPAY_SANDBOX') === 'true'
            ? 'https://api-sandbox.kkiapay.me/api/v1'
            : 'https://api.kkiapay.me/api/v1';

        return Http::baseUrl($base)
            ->withHeaders([
                'x-api-key' => env('KKIAPAY_PRIVATE_KEY'),
                'Authorization' => env('KKIAPAY_PRIVATE_KEY'),
            ])
            ->acceptJson();
    }

    /** Verifie une transaction KkiaPay initiee cote client, avant d'activer l'abonnement. */
    public function verifierTransaction(string $transactionId): ?array
    {
        try {
            return $this->client()->post('/transactions/status', [
                'transactionId' => $transactionId,
            ])->throw()->json();
        } catch (\Throwable $e) {
            Log::error('KkiaPay: echec verification transaction - '.$e->getMessage());

            return null;
        }
    }
}
