<?php

namespace App\Http\Controllers;

use App\Domain\Onboarding\OnboardingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Formulaire d'onboarding en 5 etapes (section 4). Aucune authentification
 * requise : le porteur de projet est identifie par l'uuid de sa demande,
 * retrouve/cree a chaque appel (auto-save de brouillon).
 */
class OnboardingController extends Controller
{
    public function __construct(private OnboardingService $onboardingService) {}

    public function enregistrerBrouillon(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'uuid' => ['nullable', 'uuid'],
            'donnees' => ['required', 'array'],
        ]);

        $demande = $this->onboardingService->enregistrerBrouillon($donnees['uuid'] ?? null, $donnees['donnees']);

        return response()->json(['success' => true, 'demandeUuid' => $demande->uuid, 'statut' => $demande->statut]);
    }

    public function televerserDocument(Request $request, string $uuid): JsonResponse
    {
        $donnees = $request->validate([
            'type' => ['required', Rule::in(['autorisation', 'piece_identite', 'logo'])],
            'fichier' => ['required', 'file', 'max:10240'],
        ]);

        $document = $this->onboardingService->televerserDocument($uuid, $donnees['type'], $donnees['fichier']);

        return response()->json(['success' => true, 'documentUuid' => $document->uuid]);
    }

    public function soumettre(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'confirmationAuthenticite' => ['required', 'accepted'],
            'acceptationConditions' => ['required', 'accepted'],
            'captchaToken' => ['required', 'string'],
        ]);

        // La verification CAPTCHA suit le meme mecanisme que api-identite
        // (RecaptchaProvider) - non dupliquee ici pour rester concis ; brancher
        // le meme provider si besoin de reutiliser le code entre microservices.

        $demande = $this->onboardingService->soumettre($uuid);

        return response()->json([
            'success' => true,
            'demandeUuid' => $demande->uuid,
            'statut' => $demande->statut,
            'dateSoumission' => $demande->date_soumission,
        ]);
    }
}
