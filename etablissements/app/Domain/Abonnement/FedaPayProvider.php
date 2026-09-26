<?php

namespace App\Domain\Abonnement;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Integration FedaPay pour le paiement des abonnements (section 9).
 *
 * NB : l'API FedaPay evolue ; verifie les endpoints exacts dans leur
 * documentation officielle (https://docs.fedapay.com) avant mise en
 * production. Structure ci-dessous conforme a l'API v1 au moment de
 * l'ecriture (transactions + generation de token de paiement).
 */
class FedaPayProvider
{
    private function baseUrl(): string
    {
        return env('FEDAPAY_ENVIRONMENT', 'sandbox') === 'live'
            ? 'https://api.fedapay.com/v1'
            : 'https://sandbox-api.fedapay.com/v1';
    }

    private function client()
    {
        return Http::baseUrl($this->baseUrl())
            ->withToken(env('FEDAPAY_SECRET_KEY'))
            ->acceptJson();
    }

    /** Cree une transaction et retourne l'URL de paiement a rediriger le dirigeant. */
    public function initierPaiement(AbonnementPaiement $paiement, string $descriptionClient, string $emailClient, string $callbackUrl): ?string
    {
        try {
            $reponse = $this->client()->post('/transactions', [
                'description' => "Abonnement SIGAPEI - {$descriptionClient}",
                'amount' => (int) $paiement->montant,
                'currency' => ['iso' => 'XOF'],
                'callback_url' => $callbackUrl,
                'customer' => ['email' => $emailClient],
            ])->throw()->json();

            $transactionId = $reponse['v1/transaction']['id'] ?? null;
            if (! $transactionId) {
                return null;
            }

            $paiement->update(['reference_externe' => (string) $transactionId]);

            $token = $this->client()->post("/transactions/{$transactionId}/token")->throw()->json();

            return $token['url'] ?? null;
        } catch (\Throwable $e) {
            Log::error('FedaPay: echec initiation paiement - '.$e->getMessage());

            return null;
        }
    }

    /** Verifie le statut reel d'une transaction (webhook ou polling). */
    public function verifierTransaction(string $transactionId): ?string
    {
        try {
            $reponse = $this->client()->get("/transactions/{$transactionId}")->throw()->json();

            return $reponse['v1/transaction']['status'] ?? null; // 'approved' | 'declined' | 'pending'
        } catch (\Throwable $e) {
            Log::error('FedaPay: echec verification transaction - '.$e->getMessage());

            return null;
        }
    }
}
