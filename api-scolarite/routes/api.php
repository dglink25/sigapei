<?php

use App\apprenants\ApprenantController;
use App\classes\ClasseController;
use App\common\Middleware\VerifyTenantAndJwt;
use App\common\Responses\ApiResponse;
use App\emplois_du_temps\EmploiDuTempsController;
use Illuminate\Support\Facades\Route;

// Sonde de sante (hors prefixe v1)
Route::get('/sante', function () {
    return response()->json([
        'statut' => 'ok',
        'service' => 'api-scolarite',
        'horodatage' => now()->toIso8601String(),
    ]);
});

// Routes metier sous le prefixe v1, protegees par VerifyTenantAndJwt
Route::prefix('v1')->middleware([VerifyTenantAndJwt::class])->group(function () {
    // --- Classes, Niveaux, Filieres ---
    Route::get('/classes', [ClasseController::class, 'index']);
    Route::post('/classes', [ClasseController::class, 'store']);
    Route::get('/classes/{uuid}/disponibilite', [ClasseController::class, 'disponibilite']);

    // --- Apprenants & Dossiers ---
    Route::get('/apprenants/{uuid}', [ApprenantController::class, 'show']);
    Route::post('/apprenants/{uuid}/transfert', [ApprenantController::class, 'transfert']);
    Route::get('/apprenants/{uuid}/paiements-scolarite', [ApprenantController::class, 'paiementsScolarite']);

    // --- Emplois du temps ---
    Route::get('/emplois-du-temps', [EmploiDuTempsController::class, 'index']);
    Route::post('/emplois-du-temps', [EmploiDuTempsController::class, 'store']);

    // --- Endpoints internes (consommes par d'autres microservices) ---
    Route::get('/interne/apprenants/{uuid}/classe', [ApprenantController::class, 'infoInterneClasse']);
});
