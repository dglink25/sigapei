<?php

use App\Common\Middleware\VerifyRole;
use App\Common\Middleware\VerifyTenantAndJwt;
use App\Http\Middleware\ForcerReponseJson;
use App\Http\Middleware\VerifierSecretInterne;
use App\Http\Middleware\VerifierSignatureWebhook;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        // Base imposée : https://api-finances.../v1 (pas de préfixe /api)
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        health: '/sante',
        then: function () {
            // Limiteurs nommés (aucune authentification Laravel ici : clé = utilisateur Gateway ou IP).
            RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($r->header('X-User-Id') ?: $r->ip()));
            RateLimiter::for('paiement', fn (Request $r) => Limit::perMinute(20)->by('p:'.($r->header('X-User-Id') ?: $r->ip())));
            RateLimiter::for('webhook', fn (Request $r) => Limit::perMinute(300)->by('w:'.$r->ip()));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [ForcerReponseJson::class]);
        $middleware->alias([
            // Contexte Gateway (secret interne + X-Tenant-Id, X-User-Id, X-User-Role)
            'auth.tenant' => VerifyTenantAndJwt::class,
            'role' => VerifyRole::class,
            'secret.interne' => VerifierSecretInterne::class,
            'webhook' => VerifierSignatureWebhook::class,
        ]);
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Jamais de trace ni de message interne en réponse : détail en log uniquement.
        $exceptions->render(function (Throwable $e, $request) {
            if ($e instanceof ValidationException) {
                return null; // rendu standard 422 de Laravel
            }

            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;

            if ($status >= 500) {
                Log::error('[EXCEPTION_NON_ATTRAPEE] '.$e->getMessage(), [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $status >= 500
                    ? 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.'
                    : ($e->getMessage() ?: 'Requête refusée.'),
                'error' => ['code' => $status >= 500 ? 'ERREUR_SERVEUR' : 'REQUETE_REFUSEE'],
            ], $status);
        });
    })
    ->create();
