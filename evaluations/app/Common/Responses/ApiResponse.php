<?php

namespace App\Common\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Format de réponse unifié SIGAPEI.
 *
 * Convention des messages :
 * - 'message'        → message simple, lisible par tout utilisateur
 * - 'error.code'     → code technique pour les développeurs (logs, monitoring)
 * - 'error.detail'   → détail technique, présent uniquement en APP_DEBUG=true
 */
class ApiResponse
{
    public static function succes(mixed $data = null, string $message = 'Opération réussie.', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    /**
     * @param string $messageUtilisateur  Message simple pour l'utilisateur
     * @param string $codeTechnique       Code lisible par les devs (jamais exposé tel quel à l'UI)
     * @param int    $status              Code HTTP
     * @param string $detailTechnique     Détail dev (affiché seulement en debug, loggé toujours)
     */
    public static function erreur(
        string $messageUtilisateur,
        string $codeTechnique = 'ERREUR',
        int    $status = 400,
        string $detailTechnique = ''
    ): JsonResponse {
        // Toujours loguer le détail technique
        if ($detailTechnique) {
            Log::error("[{$codeTechnique}] {$detailTechnique}");
        }

        $body = [
            'success' => false,
            'message' => $messageUtilisateur,
            'error'   => [
                'code' => $codeTechnique,
            ],
        ];

        // Détail technique uniquement en mode debug (jamais en production)
        if (config('app.debug') && $detailTechnique) {
            $body['error']['detail'] = $detailTechnique;
        }

        return response()->json($body, $status);
    }
}
