<?php

use App\Common\Middlewares\ResolveTenantContext;
use App\Common\Middlewares\VerifyCaptcha;
use App\Common\Middlewares\VerifySecretInternal;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            // Regle n°3 - endpoints /interne/* : secret partage X-Internal-Secret.
            'interne' => VerifySecretInternal::class,

            // Regle n°4 - captchaToken verifie sur les soumissions libres.
            'captcha' => VerifyCaptcha::class,

            // Regle n°5 - contexte transmis par la passerelle (aucun JWT verifie ici).
            'tenant' => ResolveTenantContext::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
