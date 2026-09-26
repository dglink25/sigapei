<?php

namespace App\Http\Controllers;

use App\Domain\Validation\ValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Acces au formulaire de correction via lien signe a usage unique (section
 * 7.2) : aucune authentification, le jeton fait office de preuve de
 * possession du canal de notification.
 */
class CorrectionController extends Controller
{
    public function __construct(private ValidationService $validationService) {}

    public function afficher(string $token): JsonResponse
    {
        $demande = app(\App\Domain\Validation\CorrectionTokenService::class)->resoudre($token);

        if (! $demande) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'LIEN_CORRECTION_INVALIDE', 'message' => 'Ce lien est invalide ou a expire.'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'demandeUuid' => $demande->uuid,
            'champsACorreiger' => $demande->champs_a_corriger,
            'donneesFormulaire' => $demande->donnees_formulaire,
        ]);
    }

    public function soumettre(Request $request, string $token): JsonResponse
    {
        $donnees = $request->validate(['donnees' => ['required', 'array']]);

        $demande = $this->validationService->soumettreCorrection($token, $donnees['donnees']);

        return response()->json(['success' => true, 'demandeUuid' => $demande->uuid, 'statut' => $demande->statut]);
    }
}
