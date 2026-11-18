<?php

namespace App\candidatures;

use App\appels_candidatures\AppelPublicController;
use App\common\Responses\ApiResponse;
use App\common\Services\InterneClient;
use App\common\Services\TenantResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Soumission publique d'une candidature (sans JWT).
 * Un parent/tuteur peut candidater sans avoir de compte SIGAPEI.
 *
 * POST /v1/public/candidatures
 *
 * Champs requis : appel_uuid, nom, prenom, date_naissance + slug ou etablissement_uuid
 */
class CandidaturePublicController extends Controller
{
    public function __construct(
        protected CandidatureService $service,
        private TenantResolver $resolver,
        private InterneClient $interne,
    ) {}

    public function store(Request $request): JsonResponse
    {
        // 1. Identifier l'établissement
        $slug              = $request->input('slug') ?? $request->header('X-Etablissement-Slug');
        $etablissementUuid = $request->input('etablissement_uuid');

        if (empty($slug) && empty($etablissementUuid)) {
            return ApiResponse::erreur('Paramètre slug ou etablissement_uuid requis.', 'TENANT_MANQUANT', 422);
        }

        // Résoudre slug → UUID si nécessaire
        if (!empty($slug) && empty($etablissementUuid)) {
            try {
                $reponse = $this->interne->get('etablissements', "/v1/interne/resolution-slug/{$slug}");
                $etablissementUuid = $reponse['tenantUuid'] ?? $reponse['uuid'] ?? null;
            } catch (\Throwable) {}
            if (empty($etablissementUuid)) {
                return ApiResponse::erreur('Établissement introuvable.', 'TENANT_INVALIDE', 404);
            }
        }

        // Résoudre UUID → tenant_id
        try {
            $tenantId = $this->resolver->resoudre($etablissementUuid);
        } catch (\Throwable $e) {
            return ApiResponse::erreur('Établissement introuvable.', 'TENANT_INVALIDE', 404);
        }

        app()->instance('current_tenant_id', $tenantId);
        app()->instance('current_tenant_ref', $etablissementUuid);

        // 2. Valider les données de candidature
        $validated = $request->validate([
            'appel_uuid'      => 'nullable|uuid',
            'nom'             => 'required|string|max:100',
            'prenom'          => 'required|string|max:100',
            'date_naissance'  => 'required|date',
            'sexe'            => 'nullable|string|in:M,F',
            'email'           => 'nullable|email|max:150',
            'telephone'       => 'nullable|string|max:50',
            'adresse'         => 'nullable|string|max:255',
            'classe_visee_id' => 'nullable|integer',
            'parent_nom'      => 'nullable|string|max:100',
            'parent_prenom'   => 'nullable|string|max:100',
            'parent_telephone'=> 'nullable|string|max:50',
            'parent_email'    => 'nullable|email|max:150',
            'parent_lien'     => 'nullable|string|max:50',
        ]);

        try {
            $candidature = $this->service->soumettreCandidature($validated);

            return ApiResponse::succes([
                'uuid'            => $candidature->uuid,
                'statut'          => $candidature->statut,
                'date_soumission' => $candidature->date_soumission->toIso8601String(),
            ], 'Candidature soumise avec succès.', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_SOUMISSION', 400);
        }
    }
}
