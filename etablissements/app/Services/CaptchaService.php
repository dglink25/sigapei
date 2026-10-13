<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Verification CAPTCHA cote serveur (reCAPTCHA v3 ou hCaptcha), meme logique
 * que RecaptchaProvider d'api-identite. Appelee avant la soumission finale
 * du formulaire public d'onboarding (section 15 du cahier des charges).
 */
class CaptchaService
{
    public function verifier(string $token): bool
    {
        // Bascule de test, uniquement hors production.
        if (env('APP_ENV') !== 'production' && $token === 'test-bypass') {
            return true;
        }

        $url = env('CAPTCHA_PROVIDER', 'recaptcha') === 'hcaptcha'
            ? 'https://hcaptcha.com/siteverify'
            : 'https://www.google.com/recaptcha/api/siteverify';

        try {
            $reponse = Http::asForm()->timeout(8)->post($url, [
                'secret' => env('CAPTCHA_SECRET_KEY'),
                'response' => $token,
            ])->json();

            $score = $reponse['score'] ?? 1;

            return ($reponse['success'] ?? false) && $score >= (float) env('CAPTCHA_MIN_SCORE', 0.5);
        } catch (\Throwable $e) {
            Log::warning('Echec verification CAPTCHA: '.$e->getMessage());

            return false;
        }
    }
}
