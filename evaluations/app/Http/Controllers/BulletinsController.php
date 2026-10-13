<?php

namespace App\Http\Controllers;

use App\Services\BulletinService;
use App\Services\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Guide suprême 03-structure-projet.md : contrôleur cité explicitement.
 * Endpoints : GET /bulletins/apprenant/{uuid}, GET /bulletins/apprenant/{uuid}/pdf,
 *             POST /periodes/{uuid}/cloturer, GET /classements/classe/{uuid},
 *             POST /modeles-bulletin
 */
class BulletinsController extends Controller
{
    public function __construct(
        private readonly BulletinService $bulletin,
        private readonly TemplateService $template,
    ) {}

    /**
     * GET /v1/bulletins/apprenant/{uuid}
     * Guide requirements §11, §15 : calculé à la volée (période ouverte)
     * ou instantané (période clôturée).
     */
    public function consulter(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * GET /v1/bulletins/apprenant/{uuid}/pdf
     * Guide requirements §11.4 : URL signée et expirante.
     */
    public function pdf(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * POST /v1/periodes/{uuid}/cloturer
     * Guide requirements §9 : calcul + instantané + PDF async + événement RabbitMQ.
     */
    public function cloturerPeriode(Request $request, string $uuid): JsonResponse
    {
        // TODO(DECISION-15) : structure ressource "période" à trancher
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * GET /v1/classements/classe/{uuid}
     * Guide requirements §8 : rang, moyenne de classe, distribution min/max.
     */
    public function classement(Request $request, string $uuid): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }

    /**
     * POST /v1/modeles-bulletin
     * Guide requirements §10 : création/mise à jour par tenant et cycle.
     */
    public function modele(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Non implémenté'], 501);
    }
}
