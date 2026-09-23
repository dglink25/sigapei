<?php

namespace App\Presences;

use App\Common\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Presences\StorePresencesRequest;
use App\Http\Requests\Presences\UpdatePresenceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    public function __construct(
        private readonly PresenceService $presences,
    ) {}

    public function store(StorePresencesRequest $request): JsonResponse
    {
        $presences = $this->presences->enregistrerCours(
            TenantContext::mustHaveTenant(),
            $request->validated(),
        );

        return response()->json(['presences' => $presences], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = array_filter($request->only([
            'classe_uuid',
            'apprenant_uuid',
            'cours_uuid',
            'statut',
            'date',
            'date_from',
            'date_to',
            'limit',
        ]), fn ($value) => $value !== null);

        return response()->json([
            'presences' => $this->presences->liste(TenantContext::mustHaveTenant(), $filters),
        ]);
    }

    public function update(UpdatePresenceRequest $request, string $uuid): JsonResponse
    {
        $data = $request->validated();

        $presence = $this->presences->corriger(
            TenantContext::mustHaveTenant(),
            $uuid,
            $data['statut'],
            $data['motif'] ?? null,
        );

        return response()->json(['presence' => $presence]);
    }

    public function syntheseAbsences(Request $request, string $uuid): JsonResponse
    {
        return response()->json([
            'synthese' => $this->presences->syntheseAbsences(
                TenantContext::mustHaveTenant(),
                $uuid,
            ),
        ]);
    }
}
