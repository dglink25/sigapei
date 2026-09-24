<?php

namespace App\Discipline;

use App\Common\TenantContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Discipline\StoreIncidentRequest;
use App\Http\Requests\Discipline\StoreSanctionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncidentController extends Controller
{
    public function __construct(
        private readonly DisciplineService $discipline,
    ) {}

    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $incident = $this->discipline->signaler(
            TenantContext::mustHaveTenant(),
            $request->validated(),
        );

        return response()->json(['incident' => $incident], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = array_filter($request->only([
            'classe_uuid',
            'apprenant_uuid',
            'type',
            'limit',
        ]), fn ($value) => $value !== null);

        return response()->json([
            'incidents' => $this->discipline->liste(TenantContext::mustHaveTenant(), $filters),
        ]);
    }

    public function storeSanction(StoreSanctionRequest $request, string $uuid): JsonResponse
    {
        $incident = $this->discipline->appliquerSanction(
            TenantContext::mustHaveTenant(),
            $uuid,
            $request->validated()['sanction'],
        );

        return response()->json(['incident' => $incident]);
    }
}
