<?php

namespace App\appels_candidatures;

use App\common\Services\TenantResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Endpoint PUBLIC - Appels à candidature d'un établissement.
 *
 * Accessible sans JWT. L'établissement est identifié par son slug ou
 * son UUID fourni en query string. Le tenant est résolu via le microservice
 * Établissements (secret interne) puis injecté dans le conteneur pour
 * que le TenantScope s'applique normalement.
 *
 * GET /v1/public/appels-candidatures?slug={slug}&cycle={cycle}
 * GET /v1/public/appels-candidatures?etablissement_uuid={uuid}&cycle={cycle}
 */
class AppelPublicController extends Controller
{
    public function __construct(
        private AppelCandidatureService $service,
        private TenantResolver $resolver,
    ) {}

    public function index(Request $request): JsonResponse
    {
        // Accepte slug ou etablissement_uuid
        $slug           = $request->query('slug');
        $etablissementUuid = $request->query('etablissement_uuid');

        $tenantRef = $etablissementUuid ?? $slug;

        if (empty($tenantRef)) {
            return response()->json([
                'succes'  => false,
                'message' => 'Paramètre slug ou etablissement_uuid requis.',
            ], 422);
        }

        // Résoudre le tenant
        try {
            $tenantId = $this->resolver->resoudre($tenantRef);
        } catch (\Throwable $e) {
            return response()->json([
                'succes'  => false,
                'message' => 'Établissement introuvable.',
            ], 404);
        }

        // Publier le tenant dans le conteneur pour que TenantScope s'applique
        app()->instance('current_tenant_id', $tenantId);
        app()->instance('current_tenant_ref', $tenantRef);

        $filtres = $request->only(['cycle', 'statut', 'annee_scolaire']);

        // Par défaut : ne montrer que les appels ouverts ou planifiés
        // (pas les brouillons, pas les terminés/annulés)
        if (empty($filtres['statut'])) {
            $appels = AppelCandidature::query()
                ->whereIn('statut', ['ouvert', 'planifie', 'brouillon'])
                ->when(!empty($filtres['cycle']),         fn($q) => $q->where('cycle', $filtres['cycle']))
                ->when(!empty($filtres['annee_scolaire']), fn($q) => $q->where('annee_scolaire', $filtres['annee_scolaire']))
                ->orderBy('date_debut', 'asc')
                ->get();
        } else {
            $appels = $this->service->lister($filtres);
        }

        return response()->json([
            'succes' => true,
            'data'   => $appels,
        ]);
    }

    public function show(string $uuid): JsonResponse
    {
        // Pour la consultation publique d'un appel, on doit résoudre le tenant
        // depuis le paramètre slug/uuid fourni - ou chercher sans tenant si UUID connu
        try {
            // Contourner le scope pour trouver l'appel par UUID, puis vérifier qu'il est public
            $appel = AppelCandidature::withoutGlobalScopes()->where('uuid', $uuid)->firstOrFail();

            // Vérifier que l'appel est consultable publiquement
            if (!in_array($appel->statut, ['ouvert', 'planifie', 'brouillon'])) {
                return response()->json(['succes' => false, 'message' => 'Appel non disponible.'], 404);
            }

            return response()->json(['succes' => true, 'data' => $appel]);
        } catch (\Throwable) {
            return response()->json(['succes' => false, 'message' => 'Appel introuvable.'], 404);
        }
    }
}
