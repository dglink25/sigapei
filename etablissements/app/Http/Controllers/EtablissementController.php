<?php

namespace App\Http\Controllers;

use App\Domain\Abonnement\AbonnementService;
use App\Domain\Etablissement\Etablissement;
use App\Domain\Etablissement\InfoEtablissementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EtablissementController extends Controller
{
    public function __construct(
        private AbonnementService $abonnementService,
        private InfoEtablissementService $infoService,
    ) {}

    /** Informations publiques d'un etablissement a partir de son code (XXXX), sans authentification. */
    public function parCode(string $code): JsonResponse
    {
        $etablissement = $this->infoService->parCode($code);

        if (! $etablissement) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ETABLISSEMENT_INTROUVABLE', 'message' => 'Aucun établissement ne correspond à ce code.'],
            ], 404);
        }

        return response()->json(['success' => true, 'etablissement' => $etablissement]);
    }

    public function cyclesAutorises(string $slug): JsonResponse
    {
        $etablissement = Etablissement::where('slug', $slug)->firstOrFail();

        return response()->json([
            'success' => true,
            'cyclesAutorises' => $etablissement->cyclesAutorises()->get(['cycle', 'statut']),
        ]);
    }

    public function plansDisponibles(): JsonResponse
    {
        return response()->json(['success' => true, 'plans' => $this->abonnementService->plansDisponibles()]);
    }

    public function souscrireAbonnement(Request $request, string $slug): JsonResponse
    {
        $etablissement = Etablissement::where('slug', $slug)->firstOrFail();
        $donnees = $request->validate(['planUuid' => ['required', 'uuid']]);

        $abonnement = $this->abonnementService->souscrire($etablissement, $donnees['planUuid']);

        return response()->json(['success' => true, 'abonnementUuid' => $abonnement->uuid, 'statut' => $abonnement->statut]);
    }
}
