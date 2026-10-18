<?php

use App\Common\Middleware\VerifyRole;
use App\Common\Middleware\VerifyTenantAndJwt;
use App\Common\Responses\ApiResponse;
use App\Exceptions\MetierException;
use App\Http\Middleware\ForcerReponseJson;
use App\Http\Middleware\VerifierSecretInterne;
use App\Integrations\ContratIncompletException;
use App\Integrations\ServiceIndisponibleException;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        // Base imposée par le CDC : https://api-evaluations.../v1 (pas de préfixe /api)
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        // /health (CDC §19.1) est déclaré dans routes/api.php ; /sante pour l'uniformité plateforme.
        health: '/sante',
        then: function () {
            // Limite par utilisateur (ou par IP à défaut) : 120 requêtes/minute.
            RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($r->header('X-User-Id') ?: $r->ip()));
            // Actions lourdes ou sensibles (clôture, contestation) : 10/minute/utilisateur.
            RateLimiter::for('sensible', fn (Request $r) => Limit::perMinute(10)->by('s:'.($r->header('X-User-Id') ?: $r->ip())));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [ForcerReponseJson::class]);

        $middleware->alias([
            'auth.tenant' => VerifyTenantAndJwt::class,
            'role' => VerifyRole::class,
            'secret.interne' => VerifierSecretInterne::class,
        ]);

        // Le contexte tenant DOIT être posé avant la résolution des paramètres de route
        // ({periode}, {note}...) : sinon le filtre tenant des modèles s'applique sans tenant.
        $middleware->prependToPriorityList(SubstituteBindings::class, VerifyTenantAndJwt::class);
        $middleware->prependToPriorityList(SubstituteBindings::class, VerifyRole::class);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->dontReport([MetierException::class, ServiceIndisponibleException::class, ContratIncompletException::class]);

        $exceptions->render(function (Throwable $e, Request $request) {
            return match (true) {
                $e instanceof MetierException => ApiResponse::erreur($e->getMessage(), $e->codeTechnique, $e->statut),

                $e instanceof ValidationException => response()->json([
                    'success' => false,
                    'message' => $e->validator->errors()->first(),
                    'error' => ['code' => 'DONNEES_INVALIDES', 'details' => $e->errors()],
                ], 422),

                $e instanceof ModelNotFoundException,
                $e instanceof NotFoundHttpException => ApiResponse::erreur('Ressource introuvable.', 'RESSOURCE_INTROUVABLE', 404),

                $e instanceof ServiceIndisponibleException,
                $e instanceof ContratIncompletException => (function () use ($e) {
                    Log::error('[DEPENDANCE_INDISPONIBLE] '.$e->getMessage());

                    return ApiResponse::erreur('Un service de la plateforme est momentanément indisponible. Réessayez plus tard.', 'SERVICE_DEPENDANT_INDISPONIBLE', 503);
                })(),

                $e instanceof HttpExceptionInterface => ApiResponse::erreur(
                    $e->getStatusCode() === 429 ? 'Trop de requêtes. Patientez un instant.' : 'Requête refusée.',
                    $e->getStatusCode() === 429 ? 'TROP_DE_REQUETES' : 'REQUETE_REFUSEE',
                    $e->getStatusCode()
                ),

                default => (function () use ($e) {
                    Log::error('[EXCEPTION_NON_ATTRAPEE] '.$e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);

                    return ApiResponse::erreur('Une erreur inattendue est survenue. Veuillez réessayer plus tard.', 'ERREUR_SERVEUR', 500);
                })(),
            };
        });
    })
    ->create();
