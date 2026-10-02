<?php

use App\apprenants\ApprenantController;
use App\classes\ClasseController;
use App\common\Middleware\VerifyTenantAndJwt;
use App\docs\DocsController;
use App\emplois_du_temps\EmploiDuTempsController;
use Illuminate\Support\Facades\Route;

// Sonde de sante (hors prefixe v1)
Route::get('/sante', function () {
    return response()->json([
        'statut'     => 'ok',
        'service'    => 'api-scolarite',
        'horodatage' => now()->toIso8601String(),
    ]);
});

// Documentation interactive — catalogue complet des endpoints (public, pas de JWT requis)
Route::get('/docs', [DocsController::class, 'catalogue']);

// Routes metier sous le prefixe v1, protegees par VerifyTenantAndJwt
// Roles identite utilisables : super_admin | administrateur | personnel | enseignant | apprenant | parent
Route::prefix('v1')->middleware([VerifyTenantAndJwt::class])->group(function () {

    // --- Classes ---

    // Liste des classes : tous les rôles du personnel et de l'enseignement peuvent lire
    Route::get('/classes', [ClasseController::class, 'index'])
        ->middleware('role:administrateur,personnel,enseignant,apprenant,parent');

    // Création d'une classe : directeur uniquement
    Route::post('/classes', [ClasseController::class, 'store'])
        ->middleware('role:administrateur');

    // Disponibilite d'une classe : secretaire, directeur, ou enseignant (pour validation inscription)
    Route::get('/classes/{uuid}/disponibilite', [ClasseController::class, 'disponibilite'])
        ->middleware('role:administrateur,personnel,enseignant');

    // --- Apprenants & Dossiers ---

    // Dossier complet d'un apprenant : directeur, secretaire, enseignant, parent (le sien), apprenant (lui-meme)
    Route::get('/apprenants/{uuid}', [ApprenantController::class, 'show'])
        ->middleware('role:administrateur,personnel,enseignant,apprenant,parent');

    // Transfert de classe : directeur uniquement (action sensible)
    Route::post('/apprenants/{uuid}/transfert', [ApprenantController::class, 'transfert'])
        ->middleware('role:administrateur');

    // Paiements de scolarite (lecture seule depuis Finances) : tous peuvent consulter leur propre dossier
    Route::get('/apprenants/{uuid}/paiements-scolarite', [ApprenantController::class, 'paiementsScolarite'])
        ->middleware('role:administrateur,personnel,apprenant,parent');

    // --- Emplois du temps ---

    // Lecture : tout le monde (enseignants, apprenants, parents peuvent voir le planning)
    Route::get('/emplois-du-temps', [EmploiDuTempsController::class, 'index'])
        ->middleware('role:administrateur,personnel,enseignant,apprenant,parent');

    // Creation/modification d'un creneau : directeur ou secretaire de scolarite
    Route::post('/emplois-du-temps', [EmploiDuTempsController::class, 'store'])
        ->middleware('role:administrateur,personnel');

    // --- Endpoints internes (consommes par d'autres microservices via X-Internal-Secret) ---
    // Pas de controle de role ici — le VerifyTenantAndJwt valide le secret interne
    Route::get('/interne/apprenants/{uuid}/classe', [ApprenantController::class, 'infoInterneClasse']);
});
