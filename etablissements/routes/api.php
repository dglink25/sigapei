<?php

use App\Http\Controllers\AccueilController;
use App\Http\Controllers\CorrectionController;
use App\Http\Controllers\DocsController;
use App\Http\Controllers\EtablissementController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;

/*
 * Le prefixe "api" de Laravel est desactive dans bootstrap/app.php
 * (apiPrefix: ''), pour que les routes soient bien exposees sous /v1/...
 * conformement a api-etablissements.sigapei.com/v1/... (section 14 du
 * cahier des charges).
 */

// Tout parametre {uuid} doit etre un uuid valide : sinon la route repond 404
// au lieu de laisser PostgreSQL lever une erreur de syntaxe (500).
Route::pattern('uuid', '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');

// --- Documentation interactive (hors prefixe /v1, comme sur api-identite) ---
Route::get('/docs', [DocsController::class, 'interfaceSwagger']);
Route::get('/docs-json', [DocsController::class, 'specification']);

Route::prefix('v1')->group(function () {

    // --- Informations publiques d'un etablissement par son code XXXX (sans authentification) ---
    // Declaree avant les routes {slug} ; le motif refuse tout ce qui n'a pas 4 caracteres alphanumeriques.
    Route::get('/etablissements/code/{code}', [EtablissementController::class, 'parCode'])
        ->where('code', '[A-Za-z0-9]{4}');

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
    Route::delete('/demandes/{uuid}', [OnboardingController::class, 'supprimerBrouillon']);

    // --- Correction via lien signe (section 7.2), sans authentification ---
    Route::get('/corrections/{token}', [CorrectionController::class, 'afficher']);
    Route::post('/corrections/{token}', [CorrectionController::class, 'soumettre']);

    // --- Cycles autorises et abonnements (sections 8-9) ---
    Route::get('/etablissements/{slug}/cycles-autorises', [EtablissementController::class, 'cyclesAutorises']);
    Route::get('/etablissements/{slug}/plans-disponibles', [EtablissementController::class, 'plansDisponibles']);
    Route::post('/etablissements/{slug}/abonnement', [EtablissementController::class, 'souscrireAbonnement']);

    // --- Téléchargement de documents (UUID imprévisible = sécurité suffisante en dev) ---
    Route::get('/documents/{uuid}', [InterneController::class, 'telechargerDocument']);

    // --- Endpoints internes (Gateway / Super Administrateur) ---
    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/demandes', [InterneController::class, 'listerDemandes']);
        Route::get('/demandes/{uuid}', [InterneController::class, 'afficherDemande']);
        Route::get('/etablissements', [InterneController::class, 'listerEtablissements']);
        Route::post('/demandes/{uuid}/corrections', [InterneController::class, 'marquerCorrections']);
        Route::post('/demandes/{uuid}/renvoyer-lien', [InterneController::class, 'renvoyerLienCorrection']);
        Route::post('/demandes/{uuid}/valider', [InterneController::class, 'valider']);
        Route::delete('/demandes/{uuid}', [InterneController::class, 'supprimerBrouillon']);
        Route::post('/demandes/supprimer', [InterneController::class, 'supprimerBrouillons']);
        Route::post('/etablissements/{uuid}/suspendre', [InterneController::class, 'suspendre']);
        Route::post('/etablissements/{uuid}/reactiver', [InterneController::class, 'reactiver']);
        Route::get('/resolution-slug/{slug}', [InterneController::class, 'resolutionSlug']);
    });
});
