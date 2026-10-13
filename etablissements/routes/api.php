<?php

use App\Http\Controllers\AccueilController;
use App\Http\Controllers\CorrectionController;
use App\Http\Controllers\DocsController;
use App\Http\Controllers\EtablissementController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;


Route::pattern('uuid', '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');

// --- Documentation interactive (hors prefixe /v1, comme sur api-identite) ---
Route::get('/docs', [DocsController::class, 'interfaceSwagger']);
Route::get('/docs-json', [DocsController::class, 'specification']);

Route::prefix('v1')->group(function () {

    // --- Page d'accueil publique (section 3) ---
    Route::get('/accueil', [AccueilController::class, 'plateforme']);
    Route::get('/etablissements/{slug}/accueil', [AccueilController::class, 'etablissement']);

    // --- Referentiel geographique panafricain (section 5) ---
    Route::get('/geo/pays', [GeoController::class, 'pays']);
    Route::get('/geo/pays/{uuid}/departements', [GeoController::class, 'departements']);
    Route::get('/geo/departements/{uuid}/communes', [GeoController::class, 'communes']);
    Route::get('/geo/communes/{uuid}/arrondissements', [GeoController::class, 'arrondissements']);

    // --- Onboarding (section 4), sans authentification ---
    Route::post('/demandes', [OnboardingController::class, 'enregistrerBrouillon']);
    Route::post('/demandes/{uuid}/documents', [OnboardingController::class, 'televerserDocument']);
    Route::post('/demandes/{uuid}/soumettre', [OnboardingController::class, 'soumettre']);

    // --- Correction via lien signe (section 7.2), sans authentification ---
    Route::get('/corrections/{token}', [CorrectionController::class, 'afficher']);
    Route::post('/corrections/{token}', [CorrectionController::class, 'soumettre']);

    // --- Cycles autorises et abonnements (sections 8-9) ---
    Route::get('/etablissements/{slug}/cycles-autorises', [EtablissementController::class, 'cyclesAutorises']);
    Route::get('/etablissements/{slug}/plans-disponibles', [EtablissementController::class, 'plansDisponibles']);
    Route::post('/etablissements/{slug}/abonnement', [EtablissementController::class, 'souscrireAbonnement']);

    // --- Endpoints internes (Gateway / Super Administrateur) ---
    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/demandes', [InterneController::class, 'listerDemandes']);
        Route::post('/demandes/{uuid}/corrections', [InterneController::class, 'marquerCorrections']);
        Route::post('/demandes/{uuid}/valider', [InterneController::class, 'valider']);
        Route::post('/etablissements/{uuid}/suspendre', [InterneController::class, 'suspendre']);
        Route::post('/etablissements/{uuid}/reactiver', [InterneController::class, 'reactiver']);
        Route::get('/resolution-slug/{slug}', [InterneController::class, 'resolutionSlug']);
    });
});
