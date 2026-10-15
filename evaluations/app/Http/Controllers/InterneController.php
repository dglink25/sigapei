<?php

namespace App\Http\Controllers;

use App\Common\Responses\ApiResponse;
use App\Common\Tenant\Contexte;
use App\Models\Bulletin;
use App\Models\Periode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Endpoints internes (X-Internal-Secret), jamais exposés aux clients finaux. */
class InterneController extends Controller
{
    /**
     * GET /v1/interne/eligibilite-document/{apprenant_uuid} — consommé par Demandes administratives (CDC §17.5).
     * En-tête X-Tenant-Id obligatoire. Renvoie les bulletins archivés disponibles (dernière version par période).
     */
    public function eligibiliteDocument(Request $request, string $apprenantUuid): JsonResponse
    {
        $tenant = (string) $request->header('X-Tenant-Id', '');
        if (! ctype_digit($tenant) || (int) $tenant < 1 || ! Str::isUuid($apprenantUuid)) {
            return ApiResponse::erreur('Paramètres invalides.', 'PARAMETRES_INVALIDES', 422);
        }

        $bulletins = Contexte::executerPour((int) $tenant, function () use ($apprenantUuid) {
            $derniers = Bulletin::query()
                ->selectRaw('DISTINCT ON (periode_id) *')
                ->where('apprenant_uuid', $apprenantUuid)
                ->orderBy('periode_id')->orderByDesc('version')
                ->get();
            $periodes = Periode::whereIn('id', $derniers->pluck('periode_id'))->get()->keyBy('id');

            return $derniers->map(fn ($b) => [
                'bulletin_uuid' => $b->uuid,
                'periode_uuid' => $periodes[$b->periode_id]->uuid,
                'periode' => $periodes[$b->periode_id]->libelle,
                'annee_scolaire' => $periodes[$b->periode_id]->annee_scolaire,
                'version' => $b->version,
                'pdf_disponible' => $b->pdf_document_uuid !== null,
            ])->sortBy(['annee_scolaire', 'periode'])->values();
        });

        return ApiResponse::succes([
            'apprenant_uuid' => $apprenantUuid,
            'eligible' => $bulletins->isNotEmpty(),
            'bulletins' => $bulletins,
        ]);
    }
}
