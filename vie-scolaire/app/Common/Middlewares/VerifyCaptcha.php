<?php

namespace App\Common\Middlewares;

use App\Integrations\Captcha\CaptchaProvider;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Regle n°4 - Captcha obligatoire sur toute route qui accepte une
 * soumission libre.
 *
 * Le `captchaToken` est produit par le front-end avec la cle PUBLIQUE
 * du compte CAPTCHA partage, puis transmis soit dans le corps de la
 * requete (`captcha_token`), soit dans l'entete `X-Captcha-Token`
 * (pratique pour les requetes sans corps, comme un PUT).
 */
class VerifyCaptcha
{
    public function __construct(
        private readonly CaptchaProvider $captcha,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->input('captcha_token')
            ?? $request->header('X-Captcha-Token');

        try {
            $valide = $this->captcha->verifie(
                is_string($token) ? $token : null,
                $request->ip(),
            );
        } catch (Throwable $exception) {
            report($exception);

            // Fail closed : un CAPTCHA indeposable ne doit jamais laisser
            // passer la requete.
            return response()->json([
                'message' => 'Vérification CAPTCHA indisponible.',
            ], 503);
        }

        if (! $valide) {
            return response()->json([
                'message' => 'Vérification CAPTCHA échouée.',
            ], 422);
        }

        return $next($request);
    }
}
