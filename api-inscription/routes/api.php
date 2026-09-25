<?php

use App\candidatures\CandidatureController;
use App\common\Middleware\VerifyTenantAndJwt;
use App\pieces_justificatives\PieceJustificativeController;
use App\reinscriptions\ReinscriptionController;
use App\tests_admission\TestAdmissionController;
use Illuminate\Support\Facades\Route;

// Sonde de sante (hors prefixe v1)
Route::get('/sante', function () {
    return response()->json([
        'statut' => 'ok',
        'service' => 'api-inscription',
        'horodatage' => now()->toIso8601String(),
    ]);
});

// Routes metier sous le prefixe v1
Route::prefix('v1')->middleware([VerifyTenantAndJwt::class])->group(function () {
    // --- Candidatures ---
    Route::get('/candidatures', [CandidatureController::class, 'index']);
    Route::post('/candidatures', [CandidatureController::class, 'store']);
    Route::get('/candidatures/{uuid}', [CandidatureController::class, 'show']);
    Route::post('/candidatures/{uuid}/valider', [CandidatureController::class, 'valider']);
    Route::post('/candidatures/{uuid}/rejeter', [CandidatureController::class, 'rejeter']);

    // --- Pieces justificatives ---
    Route::post('/candidatures/{uuid}/pieces-justificatives', [PieceJustificativeController::class, 'store']);

    // --- Tests d'admission ---
    Route::post('/candidatures/{uuid}/tests-admission', [TestAdmissionController::class, 'store']);

    // --- Reinscriptions ---
    Route::post('/reinscriptions', [ReinscriptionController::class, 'store']);
});
