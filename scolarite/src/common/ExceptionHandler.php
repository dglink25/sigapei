<?php

namespace App\common;

use App\common\Responses\ApiResponse;
use Illuminate\Foundation\Exceptions\Handler as BaseExceptionHandler;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class ExceptionHandler extends BaseExceptionHandler
{
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function render($request, Throwable $e)
    {
        if ($e instanceof ValidationException) {
            return ApiResponse::erreur('Erreur de validation', 'DONNEES_INVALIDES', 422, $e->errors());
        }

        if ($e instanceof NotFoundHttpException) {
            return ApiResponse::erreur('Ressource introuvable', 'RESSOURCE_INTROUVABLE', 404);
        }

        return ApiResponse::erreur($e->getMessage(), 'ERREUR_SERVEUR', 500);
    }
}
