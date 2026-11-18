<?php

namespace App\appels_candidatures;

use App\common\Services\InterneClient;
use App\common\Services\TenantResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Endpoint PUBLIC - Appels à candidature d'un établissement.
 *
 * Accessible sans JWT. L'établissement est identifié par son slug ou
 * son UUID fourni en query string.
 *
 * GET /v1/public/appels-candidatures?slug={slug}&cycle={cycle}
 * GET /v1/public/appels-candidatures?etablissement_uuid={uuid}&cycle={cycle}
 */
class AppelPublicController extends Controller
{
    public function __construct(
        private AppelCandidatureService $service,
        private TenantResolver $resolver,
        private InterneClient $interne,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $slug              = $request->query('slug');
        $etablissementUuid = $request->query('etablissement_uuid');

        if (empty($slug) && empty($etablissementUuid)) {
            return response()->json([
                'succes'  => false,
                'message' => 'Paramètre slug ou etablissement_uuid requis.',
            ], 422);
        }

        // Si slug fourni sans UUID : résoudre via l'endpoint de résolution
        if (!empty($slug) && empty($etablissementUuid)) {
            try {
                $reponse = $this->interne->get('etablissements', "/v1/interne/resolution-slug/{$slug}");
                $etablissementUuid = $reponse['tenantUuid'] ?? $reponse['uuid'] ?? null;
            } catch (\Throwable) {
                $etablissementUuid = null;
            }
            if (empty($etablissementUuid)) {
                return response()->json(['succes' => false, 'message' => 'Établissement introuvable.'], 404);
            }
        }

        // Résoudre l'UUID → tenant_id
        try {
            $tenantId = $this->resolver->resoudre($etablissementUuid);
        } catch (\Throwable $e) {
            return response()->json([
                'succes'  => false,
                'message' => 'Établissement introuvable.',
            ], 404);
        }

        // Publier le tenant dans le conteneur pour que TenantScope s'applique
        app()->instance('current_tenant_id', $tenantId);
        app()->instance('current_tenant_ref', $etablissementUuid);

        $filtres = $request->only(['cycle', 'statut', 'annee_scolaire']);

        // Par défaut : appels ouverts, planifiés ou brouillons (pas terminés/annulés)
        $appels = AppelCandidature::query()
            ->whereIn('statut', ['ouvert', 'planifie', 'brouillon'])
            ->when(!empty($filtres['cycle']),          fn($q) => $q->where('cycle', $filtres['cycle']))
            ->when(!empty($filtres['annee_scolaire']), fn($q) => $q->where('annee_scolaire', $filtres['annee_scolaire']))
            ->orderBy('date_debut', 'asc')
            ->get();

        return response()->json([
            'succes' => true,
            'data'   => $appels,
        ]);
    }

    public function show(string $uuid): JsonResponse
    {
        try {
            $appel = AppelCandidature::withoutGlobalScopes()->where('uuid', $uuid)->firstOrFail();

            if (!in_array($appel->statut, ['ouvert', 'planifie', 'brouillon'])) {
                return response()->json(['succes' => false, 'message' => 'Appel non disponible.'], 404);
            }

            return response()->json(['succes' => true, 'data' => $appel]);
        } catch (\Throwable) {
            return response()->json(['succes' => false, 'message' => 'Appel introuvable.'], 404);
        }
    }
}
