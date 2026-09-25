<?php

namespace App\tests_admission;

use App\common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TestAdmissionController extends Controller
{
    public function __construct(
        protected TestAdmissionService $service
    ) {}

    public function store(Request $request, string $uuid): JsonResponse
    {
        $validated = $request->validate([
            'type_test' => 'required|string|max:50',
            'matiere' => 'nullable|string|max:100',
            'note' => 'nullable|numeric|min:0',
            'note_max' => 'nullable|numeric|min:1',
            'resultat' => 'required|string|in:admis,recale,en_attente',
            'observations' => 'nullable|string|max:500',
            'evalue_par_id' => 'nullable|integer',
            'date_test' => 'nullable|date',
        ]);

        try {
            $test = $this->service->enregistrerTest($uuid, $validated);

            return ApiResponse::succes([
                'uuid' => $test->uuid,
                'type_test' => $test->type_test,
                'matiere' => $test->matiere,
                'note' => $test->note,
                'note_max' => $test->note_max,
                'resultat' => $test->resultat,
            ], 'Resultat du test d\'admission enregistre', 201);
        } catch (\Throwable $e) {
            return ApiResponse::erreur($e->getMessage(), 'ERREUR_ENREGISTREMENT_TEST', 400);
        }
    }
}
