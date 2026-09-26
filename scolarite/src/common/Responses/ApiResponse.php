<?php

namespace App\common\Responses;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function succes(mixed $data = null, string $message = 'Succes', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'succes' => true,
            'message' => $message,
            'donnees' => $data,
            'horodatage' => now()->toIso8601String(),
        ], $statusCode);
    }

    public static function erreur(string $message, string $codeErreur = 'ERREUR_METIER', int $statusCode = 400, mixed $details = null): JsonResponse
    {
        return response()->json([
            'succes' => false,
            'code_erreur' => $codeErreur,
            'message' => $message,
            'details' => $details,
            'horodatage' => now()->toIso8601String(),
        ], $statusCode);
    }
}
