<?php

namespace App\Common;

use App\Discipline\DisciplineService;
use App\Http\Controllers\Controller;
use App\Presences\PresenceService;
use Illuminate\Http\JsonResponse;

/**
 * GET /apprenants/{uuid}/dossier-vie-scolaire — vue consolidee des
 * presences, absences et incidents d'un apprenant (section 8 du CDC).
 * Consultee par le parent, l'apprenant lui-meme et les profils habilites.
 */
class DossierVieScolaireController extends Controller
{
    public function __construct(
        private readonly PresenceService $presences,
        private readonly DisciplineService $discipline,
    ) {}

    public function show(string $apprenantUuid): JsonResponse
    {
        $tenantId = TenantContext::mustHaveTenant();

        return response()->json([
            'dossier' => [
                'apprenant_uuid' => $apprenantUuid,
                'synthese_absences' => $this->presences->syntheseAbsences($tenantId, $apprenantUuid),
                'presences_recentes' => $this->presences->liste($tenantId, [
                    'apprenant_uuid' => $apprenantUuid,
                    'limit' => 20,
                ]),
                'incidents' => $this->discipline->liste($tenantId, [
                    'apprenant_uuid' => $apprenantUuid,
                ]),
            ],
        ]);
    }
}
