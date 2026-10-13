<?php

use App\Common\Middleware\VerifyTenantAndJwt;
use App\Common\Middleware\VerifyRole;
use App\Http\Middleware\ForcerReponseJson;
use App\Http\Middleware\VerifierSecretInterne;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api:      __DIR__.'/../routes/api.php',
        // Base imposée par le CDC : https://api-evaluations.e-academique.com/v1 (pas de préfixe /api)
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        // Guide tasks §1.6 : endpoint /health
        // DECISION-12 : /sante utilisé par le reste de la plateforme — les deux sont exposés
        health:   '/sante',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Forcer JSON sur toutes les réponses
        $middleware->api(prepend: [ForcerReponseJson::class]);

        $middleware->alias([
            // Contexte tenant/utilisateur transmis par la Gateway (en-têtes X-Tenant-Id, X-User-Id, X-User-Role)
            'auth.tenant'    => VerifyTenantAndJwt::class,
            // Vérification du rôle (guide Tableau 1)
            'role'           => VerifyRole::class,
            // Secret interne pour les endpoints /interne/*
            'secret.interne' => VerifierSecretInterne::class,
        ]);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Formater toutes les exceptions non attrapées avec le même format ApiResponse
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->expectsJson() || $request->is('api/*') || $request->is('v1/*')) {
                \Illuminate\Support\Facades\Log::error('[EXCEPTION_NON_ATTRAPEE] ' . $e->getMessage(), [
                    'file'  => $e->getFile(),
                    'line'  => $e->getLine(),
                    'trace' => config('app.debug') ? $e->getTraceAsString() : null,
                ]);

                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;

                $message = $status >= 500
                    ? 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.'
                    : $e->getMessage();

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'error'   => [
                        'code'   => 'ERREUR_SERVEUR',
                        'detail' => config('app.debug') ? $e->getMessage() : null,
                    ],
                ], $status);
            }
        });
    })
    ->create();
