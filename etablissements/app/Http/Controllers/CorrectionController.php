<?php

namespace App\Http\Controllers;

use App\Domain\Validation\CorrectionTokenService;
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
    public function __construct(
        private ValidationService $validationService,
        private CorrectionTokenService $tokenService,
    ) {}

    public function afficher(string $token): JsonResponse
    {
        $demande = $this->tokenService->resoudre($token);

        if (! $demande) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'LIEN_CORRECTION_INVALIDE', 'message' => 'Ce lien est invalide ou a expiré.'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'demandeUuid' => $demande->uuid,
            'champsACorriger' => $demande->champs_a_corriger,
            'donneesFormulaire' => $demande->donnees_formulaire,
        ]);
    }

    public function soumettre(Request $request, string $token): JsonResponse
    {
        // 'donnees' peut être vide si seule la section documents est à corriger
        // (les documents sont uploadés séparément via POST /demandes/{uuid}/documents)
        $donnees = $request->validate(['donnees' => ['present', 'array']]);

        $demande = $this->validationService->soumettreCorrection($token, $donnees['donnees']);

        return response()->json(['success' => true, 'demandeUuid' => $demande->uuid, 'statut' => $demande->statut]);
    }
}
