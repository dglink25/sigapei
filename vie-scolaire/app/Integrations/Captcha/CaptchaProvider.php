<?php

namespace App\Integrations\Captcha;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Regle n°4 - verification CAPTCHA partage.
 *
 * Un seul compte reCAPTCHA (ou hCaptcha) existe pour toute la
 * plateforme : memes CAPTCHA_PROVIDER, CAPTCHA_SECRET_KEY et
 * CAPTCHA_MIN_SCORE que ceux deja en place dans le microservice
 * identite. On n'en cree pas un par microservice.
 *
 * La verification reproduit l'appel HTTP officiel du fournisseur
 * (cote serveur, avec la cle SECRETE) :
 *  - reCAPTCHA v3 : https://www.google.com/recaptcha/api/siteverify
 *  - hCaptcha     : https://api.hcaptcha.com/siteverify
 *
 * Pour reCAPTCHA v3, la reponse ne contient pas de boolen `success`
 * : seul le score compte, et il doit atteindre CAPTCHA_MIN_SCORE.
 * hCaptcha renvoie, lui, un `success` booleen.
 *
 * Rappel : la cle PUBLIQUE (celle utilisee par le front pour generer
 * le `captchaToken`) n'a rien a faire dans le .env d'un backend.
 */
class CaptchaProvider
{
    /**
     * Verifie un `captchaToken` produit par le front-end.
     *
     * @throws RuntimeException si le fournisseur est injoignable
     */
    public function verifie(?string $captchaToken, ?string $ip = null): bool
    {
        if ($captchaToken === null || trim($captchaToken) === '') {
            return false;
        }

        $payload = [
            'secret' => (string) config('services.captcha.secret', ''),
            'response' => $captchaToken,
        ];

        if ($ip !== null) {
            $payload['remoteip'] = $ip;
        }

        $reponse = $this->appelle($payload);

        if ($this->estHcaptcha()) {
            return (bool) ($reponse['success'] ?? false);
        }

        // reCAPTCHA v3 : score de 0.0 a 1.0, pas de booleen.
        if (($reponse['success'] ?? false) !== true) {
            return false;
        }

        return (float) ($reponse['score'] ?? 0.0) >= (float) config('services.captcha.min_score', 0.5);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function appelle(array $payload): array
    {
        $secret = (string) config('services.captcha.secret', '');
        if ($secret === '') {
            throw new RuntimeException(
                'Configuration CAPTCHA_SECRET_KEY absente : verification CAPTCHA impossible.'
            );
        }

        try {
            $reponse = Http::asForm()
                ->timeout((int) config('services.captcha.timeout', 5))
                ->post($this->endpoint(), $payload);
        } catch (ConnectionException $exception) {
            throw new RuntimeException(
                'Fournisseur CAPTCHA injoignable : '.$exception->getMessage(),
                previous: $exception
            );
        }

        if (! $reponse->successful()) {
            throw new RuntimeException(
                "Le fournisseur CAPTCHA a repondu {$reponse->status()}."
            );
        }

        $donnees = $reponse->json();

        return is_array($donnees) ? $donnees : [];
    }

    private function endpoint(): string
    {
        $provider = (string) config('services.captcha.provider', 'recaptcha');
        $endpoints = config('services.captcha.endpoints', []);

        if (! isset($endpoints[$provider])) {
            throw new RuntimeException("Fournisseur CAPTCHA inconnu : « {$provider} ».");
        }

        return $endpoints[$provider];
    }

    private function estHcaptcha(): bool
    {
        return (string) config('services.captcha.provider', 'recaptcha') === 'hcaptcha';
    }
}
