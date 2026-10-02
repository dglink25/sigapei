<?php

use App\candidatures\CandidatureController;
use App\common\Middleware\VerifyTenantAndJwt;
use App\docs\DocsController;
use App\pieces_justificatives\PieceJustificativeController;
use App\reinscriptions\ReinscriptionController;
use App\tests_admission\TestAdmissionController;
use Illuminate\Support\Facades\Route;

// Sonde de sante (hors prefixe v1)
Route::get('/sante', function () {
    return response()->json([
        'statut'      => 'ok',
        'service'     => 'api-inscription',
        'horodatage'  => now()->toIso8601String(),
    ]);
});

// Documentation interactive — catalogue complet des endpoints (public, pas de JWT requis)
Route::get('/docs', [DocsController::class, 'catalogue']);

// Routes metier sous le prefixe v1, protegees par VerifyTenantAndJwt
// Roles identite utilisables : super_admin | administrateur | personnel | enseignant | apprenant | parent
Route::prefix('v1')->middleware([VerifyTenantAndJwt::class])->group(function () {

    // --- Candidatures ---

    // Lecture : secretaire (personnel), directeur (administrateur), jury (enseignant)
    Route::get('/candidatures', [CandidatureController::class, 'index'])
        ->middleware('role:administrateur,personnel,enseignant');

    // Soumission publique : ouverte sans JWT (parent/tuteur sans compte)
    // Le VerifyTenantAndJwt laisse passer POST /candidatures sans Bearer (exception metier)
    Route::post('/candidatures', [CandidatureController::class, 'store']);

    // Consultation du dossier : secretaire, directeur, jury
    Route::get('/candidatures/{uuid}', [CandidatureController::class, 'show'])
        ->middleware('role:administrateur,personnel,enseignant');

    // Validation definitive : directeur uniquement (cree l'apprenant dans scolarite)
    Route::post('/candidatures/{uuid}/valider', [CandidatureController::class, 'valider'])
        ->middleware('role:administrateur');

    // Rejet avec motif : directeur ou secretaire
    Route::post('/candidatures/{uuid}/rejeter', [CandidatureController::class, 'rejeter'])
        ->middleware('role:administrateur,personnel');

    // --- Pieces justificatives ---
    // Ajout d'une piece : secretaire ou le service lui-meme (interne)
    Route::post('/candidatures/{uuid}/pieces-justificatives', [PieceJustificativeController::class, 'store'])
        ->middleware('role:administrateur,personnel');

    // --- Tests d'admission ---
    // Saisie des notes : jury enseignant ou directeur
    Route::post('/candidatures/{uuid}/tests-admission', [TestAdmissionController::class, 'store'])
        ->middleware('role:administrateur,enseignant');

    // --- Reinscriptions ---
    // Reconduite d'un apprenant vers une nouvelle classe : secretaire ou directeur
    Route::post('/reinscriptions', [ReinscriptionController::class, 'store'])
        ->middleware('role:administrateur,personnel');
});
