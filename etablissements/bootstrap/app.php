<?php

use App\Http\Middleware\ContexteTenant;
use App\Http\Middleware\ForcerReponseJson;
use App\Http\Middleware\VerifierSecretInterne;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/sante',
        // Pas de prefixe "api" : les routes sont exposees sous /v1/... (voir routes/api.php).
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            ForcerReponseJson::class,
        ]);

        $middleware->alias([
            'secret.interne' => VerifierSecretInterne::class,
            'contexte.tenant' => ContexteTenant::class,
        ]);

        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Enveloppe d'erreur identique a celle d'api-identite :
        // { success: false, error: { code, message, details }, path, timestamp }
        $exceptions->render(function (Throwable $e, Request $request) {
            $enveloppe = function (int $statut, string $code, string $message, mixed $details = null) use ($request) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => $code, 'message' => $message, 'details' => $details],
                    'path' => $request->getRequestUri(),
                    'timestamp' => now()->toIso8601String(),
                ], $statut);
            };

            if ($e instanceof ValidationException) {
                return $enveloppe(422, 'DONNEES_INVALIDES', 'Les données envoyées sont invalides.', $e->errors());
            }

            if ($e instanceof AuthenticationException) {
                return $enveloppe(401, 'NON_AUTHENTIFIE', 'Authentification requise.');
            }

            if ($e instanceof HttpExceptionInterface) {
                $statut = $e->getStatusCode();
                $codes = [
                    400 => 'REQUETE_INVALIDE',
                    401 => 'NON_AUTHENTIFIE',
                    403 => 'ACCES_REFUSE',
                    404 => 'RESSOURCE_INTROUVABLE',
                    405 => 'METHODE_NON_AUTORISEE',
                    409 => 'CONFLIT',
                    422 => 'DONNEES_INVALIDES',
                    429 => 'TROP_DE_REQUETES',
                ];
                // Message generique pour un 404 : evite de reveler le nom d'un modele Eloquent.
                $message = $statut === 404 ? 'Ressource introuvable.' : ($e->getMessage() ?: 'Requête refusée.');

                return $enveloppe($statut, $codes[$statut] ?? 'REQUETE_INVALIDE', $message);
            }

            // En mode debug, on laisse Laravel afficher la trace complete.
            if (config('app.debug')) {
                return null;
            }

            return $enveloppe(500, 'ERREUR_INTERNE', 'Une erreur interne est survenue.');
        });
    })
    ->create();
