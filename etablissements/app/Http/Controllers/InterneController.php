<?php

namespace App\Http\Controllers;

use App\Domain\Validation\ValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints internes (section 14) : back-office Super Administrateur et
 * passerelle API (Gateway) uniquement. Proteges par le middleware
 * secret.interne (header X-Internal-Secret), identique a api-identite.
 */
class InterneController extends Controller
{
    public function __construct(private ValidationService $validationService) {}

    public function listerDemandes(): JsonResponse
    {
        return response()->json(['success' => true, 'demandes' => $this->validationService->listerDemandesAInstruire()]);
    }

    public function marquerCorrections(Request $request, string $uuid): JsonResponse
    {
        $donnees = $request->validate(['champsACorreiger' => ['required', 'array']]);

        $demande = $this->validationService->demanderCorrection($uuid, $donnees['champsACorreiger']);

        return response()->json(['success' => true, 'demandeUuid' => $demande->uuid, 'statut' => $demande->statut]);
    }

    public function valider(string $uuid): JsonResponse
    {
        $etablissement = $this->validationService->valider($uuid);

        return response()->json([
            'success' => true,
            'etablissementUuid' => $etablissement->uuid,
            'slug' => $etablissement->slug,
            'matricule' => $etablissement->matricule,
        ]);
    }

    public function suspendre(string $uuid): JsonResponse
    {
        $etablissement = $this->validationService->suspendre($uuid);

        return response()->json(['success' => true, 'etablissementUuid' => $etablissement->uuid, 'statut' => $etablissement->statut]);
    }

    public function reactiver(string $uuid): JsonResponse
    {
        $etablissement = $this->validationService->reactiver($uuid);

        return response()->json(['success' => true, 'etablissementUuid' => $etablissement->uuid, 'statut' => $etablissement->statut]);
    }

    /** Consomme par la passerelle API a chaque requete entrante contenant un slug (section 2.1). */
    public function resolutionSlug(string $slug): JsonResponse
    {
        $resolution = $this->validationService->resoudreSlug($slug);

        if (! $resolution) {
            return response()->json(['success' => false, 'error' => ['code' => 'SLUG_INTROUVABLE']], 404);
        }

        return response()->json(['success' => true, ...$resolution]);
    }
}
