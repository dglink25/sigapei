<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Vérification reCAPTCHA Enterprise côté serveur.
 * Appelle l'API Assessment de Google Cloud reCAPTCHA Enterprise.
 * Doc : https://cloud.google.com/recaptcha/docs/create-assessment
 */
class CaptchaService
{
    public function verifier(string $token): bool
    {
        // Bypass de test uniquement hors production
        if (env('APP_ENV') !== 'production' && $token === 'test-bypass') {
            return true;
        }

        // Token vide → refuser (ne pas laisser passer silencieusement)
        if (empty($token)) {
            Log::warning('CaptchaService: token vide reçu');
            return false;
        }

        $apiKey    = env('RECAPTCHA_API_KEY');       // Clé API Google Cloud (côté serveur)
        $siteKey   = env('RECAPTCHA_SITE_KEY');      // Clé de site publique (même que le front)
        $projectId = env('RECAPTCHA_PROJECT_ID');    // ID du projet Google Cloud
        $minScore  = (float) env('CAPTCHA_MIN_SCORE', 0.5);

        if (!$apiKey || !$siteKey || !$projectId) {
            Log::warning('CaptchaService: variables RECAPTCHA_API_KEY / RECAPTCHA_SITE_KEY / RECAPTCHA_PROJECT_ID manquantes');
            // En développement sans config : laisser passer avec un avertissement
            return env('APP_ENV') !== 'production';
        }

        $url = "https://recaptchaenterprise.googleapis.com/v1/projects/{$projectId}/assessments?key={$apiKey}";

        try {
            $reponse = Http::timeout(8)->post($url, [
                'event' => [
                    'token'          => $token,
                    'siteKey'        => $siteKey,
                    'expectedAction' => 'demande', // action envoyée depuis le frontend
                ],
            ])->json();

            // Vérifier que le token est valide
            $tokenProperties = $reponse['tokenProperties'] ?? [];
            if (!($tokenProperties['valid'] ?? false)) {
                $raison = $tokenProperties['invalidReason'] ?? 'inconnue';
                Log::warning("CaptchaService: token invalide, raison: {$raison}");
                return false;
            }

            // Vérifier le score de risque
            $score = $reponse['riskAnalysis']['score'] ?? 0;
            if ($score < $minScore) {
                Log::warning("CaptchaService: score trop bas ({$score} < {$minScore})");
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('CaptchaService: échec vérification reCAPTCHA Enterprise: ' . $e->getMessage());
            return false;
        }
    }
}
