<?php

namespace App\Http\Controllers;

use App\Domain\Onboarding\OnboardingService;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class OnboardingController extends Controller{
    public function __construct(
        private OnboardingService $onboardingService,
        private CaptchaService $captchaService,
    ) {}

    public function enregistrerBrouillon(Request $request): JsonResponse    {
        try {
            Log::info('POST /demandes - Début enregistrement brouillon', [
                'uuid_recu' => $request->input('uuid'),
                'donnees_presentes' => $request->has('donnees'),
            ]);

            $donnees = $request->validate([
                'uuid' => ['nullable', 'uuid'],
                'donnees' => ['required', 'array'],
            ]);

            $demande = $this->onboardingService->enregistrerBrouillon(
                $donnees['uuid'] ?? null,
                $donnees['donnees']
            );

            if (!$demande) {
                Log::error('POST /demandes - Le service n’a retourné aucune demande');

                return response()->json([
                    'success' => false,
                    'message' => 'Le service n’a retourné aucune demande.',
                ], 500);
            }

            if (empty($demande->uuid)) {
                Log::error('POST /demandes - UUID absent après enregistrement', [
                    'demande' => $demande->toArray(),
                    'statut' => $demande->statut ?? null,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'La demande a été retournée sans UUID.',
                    'statut' => $demande->statut ?? null,
                ], 500);
            }

            Log::info('POST /demandes - Brouillon enregistré avec succès', [
                'uuid' => $demande->uuid,
                'statut' => $demande->statut,
            ]);

            return response()->json([
                'success' => true,
                'demandeUuid' => $demande->uuid,
                'statut' => $demande->statut,
            ], 200);

        } catch (ValidationException $e) {
            Log::warning('POST /demandes - Erreur de validation', [
                'errors' => $e->errors(),
            ]);

            throw $e;

        } catch (Throwable $e) {
            Log::error('POST /demandes - Erreur pendant l’enregistrement', [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l’enregistrement du brouillon.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function televerserDocument(Request $request, string $uuid): JsonResponse    {
        $donnees = $request->validate([
            'type' => ['required', Rule::in(['autorisation', 'piece_identite', 'logo'])],
            'fichier' => ['required', 'file', 'max:10240'],
        ]);

        $document = $this->onboardingService->televerserDocument($uuid, $donnees['type'], $donnees['fichier']);

        return response()->json(['success' => true, 'documentUuid' => $document->uuid]);
    }

    public function soumettre(Request $request, string $uuid): JsonResponse
    {
        $donnees = $request->validate([
            'confirmationAuthenticite' => ['required', 'accepted'],
            'acceptationConditions' => ['required', 'accepted'],
            'captchaToken' => ['required', 'string'],
        ]);

        if (! $this->captchaService->verifier($donnees['captchaToken'])) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CAPTCHA_INVALIDE',
                    'message' => 'La vérification anti-robot a échoué, veuillez réessayer.',
                ],
            ], 401);
        }

        $demande = $this->onboardingService->soumettre($uuid);

        return response()->json([
            'success' => true,
            'demandeUuid' => $demande->uuid,
            'statut' => $demande->statut,
            'dateSoumission' => $demande->date_soumission,
        ]);
    }

    /**
     * Supprime un brouillon (statut = brouillon uniquement).
     * Appelé quand l'utilisateur clique « Recommencer » pour repartir de zéro.
     */
    public function supprimerBrouillon(string $uuid): JsonResponse
    {
        $demande = \App\Domain\Onboarding\DemandeEtablissement::where('uuid', $uuid)->first();

        if (! $demande) {
            return response()->json(['success' => true]); // idempotent : déjà supprimé
        }

        if ($demande->statut !== 'brouillon') {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'DEMANDE_NON_SUPPRIMABLE', 'message' => 'Seul un brouillon peut être supprimé.'],
            ], 409);
        }

        // Supprimer les documents associés
        $demande->documents()->delete();
        $demande->delete();

        return response()->json(['success' => true]);
    }
}
