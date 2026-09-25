<?php

namespace App\apprenants;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ApprenantController extends Controller
{
    public function __construct(
        protected ApprenantService $service
    ) {}

    public function show(string $uuid): JsonResponse
    {
        try {
            $dossier = $this->service->consulterDossier($uuid);
            return ApiResponse::succes($dossier, 'Dossier apprenant recupere');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'DOSSIER_INTROUVABLE', 404);
        }
    }

    public function transfert(Request $request, string $uuid): JsonResponse
    {
        $validated = $request->validate([
            'nouvelle_classe_uuid' => 'required|uuid',
            'motif' => 'nullable|string|max:255',
        ]);

        try {
            $currentUser = app()->bound('current_user') ? app('current_user') : null;
            $effectueParId = $currentUser['sub'] ?? null;

            $resultat = $this->service->transferer(
                $uuid,
                $validated['nouvelle_classe_uuid'],
                $validated['motif'] ?? null,
                $effectueParId
            );

            return ApiResponse::succes($resultat, 'Transfert effectue avec succes');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_TRANSFERT', 400);
        }
    }

    public function paiementsScolarite(string $uuid): JsonResponse
    {
        try {
            $paiements = $this->service->consulterPaiements($uuid);
            return ApiResponse::succes($paiements, 'Situation des paiements de scolarite recuperee');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_LECTURE_PAIEMENTS', 404);
        }
    }

    public function infoInterneClasse(string $uuid): JsonResponse
    {
        try {
            $info = $this->service->obtenirInfoInterne($uuid);
            return ApiResponse::succes($info, 'Informations apprenant');
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'APPRENANT_INTROUVABLE', 404);
        }
    }
}
