<?php

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
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        // Base imposée : https://api-finances.../v1 (pas de préfixe /api)
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        health: '/sante',
        then: function () {
            // Clé = utilisateur authentifié (posé par auth.tenant), jamais un en-tête brut falsifiable.
            $cle = fn (Request $r) => app()->bound('current_user') ? 'u:'.app('current_user')['uuid'] : 'ip:'.$r->ip();
            RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($cle($r)));
            RateLimiter::for('sensible', fn (Request $r) => Limit::perMinute(20)->by('s:'.$cle($r)));
            RateLimiter::for('paiement', fn (Request $r) => Limit::perMinute(10)->by('p:'.$cle($r)));
            RateLimiter::for('telechargement', fn (Request $r) => Limit::perMinute(30)->by('t:'.$r->ip()));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [ForcerReponseJson::class]);
        $middleware->alias([
            'auth.tenant' => VerifyTenantAndJwt::class,
            'secret.interne' => VerifierSecretInterne::class,
        ]);

        // Le contexte établissement DOIT être posé avant la résolution des paramètres de route ({facture}...)
        // et avant la limitation de débit, dont la clé est l'utilisateur authentifié.
        $middleware->prependToPriorityList(ThrottleRequests::class, VerifyTenantAndJwt::class);
        $middleware->prependToPriorityList(SubstituteBindings::class, VerifyTenantAndJwt::class);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn () => true);
        $exceptions->dontReport([MetierException::class, ServiceIndisponibleException::class, ContratIncompletException::class]);

        // Jamais de trace ni de message interne en réponse : détail en log uniquement.
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

                $e instanceof InvalidSignatureException => ApiResponse::erreur('Lien de téléchargement invalide ou expiré. Relancez le téléchargement.', 'LIEN_INVALIDE', 403),

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
