<?php

use App\Http\Controllers\BulletinsController;
use App\Http\Controllers\CompositionsController;
use App\Http\Controllers\ContestationsController;
use App\Http\Controllers\EvaluationsController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\NotesController;
use Illuminate\Support\Facades\Route;

/**
 * Base : https://api-evaluations.e-academique.com/v1  (bootstrap/app.php : apiPrefix = "")
 * Endpoints : EXACTEMENT les 14 du Tableau 7 du CDC — aucun autre sans validation (DECISION-10).
 * Toutes les réponses : uuid uniquement, jamais d'identifiant interne.
 *
 * Sécurité (steering 04) :
 *  - auth.tenant : contexte transmis par la Gateway (X-Tenant-Id, X-User-Id, X-User-Role), sur TOUTES les routes /v1 métier.
 *  - role:...    : droits du Tableau 1 (rôles plateforme : administrateur | personnel | enseignant | apprenant | parent).
 *    "Censeur / Administrateur" est mappé sur "administrateur". Le rôle "personnel" n'est PAS ouvert
 *    tant que le CDC ne le précise pas. Super Administrateur : aucune route ici (aucune note individuelle).
 *  - Le contrôle fin (affectation RH, enfant rattaché, dossier propre) se fait dans les contrôleurs.
 */

// Healthcheck consommé par l'orchestrateur : sans authentification, sans donnée.
Route::get('/health', function () {
    return response()->json([
        'success'    => true,
        'service'    => 'api-evaluations',
        'statut'     => 'ok',
        'horodatage' => now()->toIso8601String(),
    ]);
});

Route::prefix('v1')->group(function () {

    // ---------- Routes métier : contexte Gateway (tenant + utilisateur) obligatoire ----------
    Route::middleware('auth.tenant')->group(function () {

        // 3. Évaluations
        Route::post('/evaluations', [EvaluationsController::class, 'creer'])
            ->middleware('role:enseignant,administrateur');

        // 1, 2, 10. Notes
        Route::post('/notes', [NotesController::class, 'saisir'])
            ->middleware('role:enseignant');
        Route::get('/notes/classe/{uuid}', [NotesController::class, 'parClasse'])
            ->middleware('role:enseignant,administrateur');
        Route::put('/notes/{uuid}/corriger', [NotesController::class, 'corriger'])
            ->middleware('role:administrateur');

        // 4. Clôture de période
        Route::post('/periodes/{uuid}/cloturer', [BulletinsController::class, 'cloturerPeriode'])
            ->middleware('role:enseignant,administrateur');

        // 5, 6. Bulletins (lecture seule)
        Route::get('/bulletins/apprenant/{uuid}', [BulletinsController::class, 'consulter'])
            ->middleware('role:apprenant,parent,enseignant,administrateur');
        Route::get('/bulletins/apprenant/{uuid}/pdf', [BulletinsController::class, 'pdf'])
            ->middleware('role:apprenant,parent,enseignant,administrateur');

        // 7. Classements
        Route::get('/classements/classe/{uuid}', [BulletinsController::class, 'classement'])
            ->middleware('role:enseignant,administrateur');

        // 8. Modèles de bulletin
        Route::post('/modeles-bulletin', [BulletinsController::class, 'modele'])
            ->middleware('role:administrateur');

        // 9. Contestations
        Route::post('/contestations', [ContestationsController::class, 'ouvrir'])
            ->middleware('role:apprenant,parent');

        // 11, 12, 13. Compositions en ligne — PHASE 2 (bloqué, requirements C1-C9)
        Route::post('/compositions', [CompositionsController::class, 'programmer'])
            ->middleware('role:enseignant,administrateur');
        Route::get('/compositions/{uuid}/supervision', [CompositionsController::class, 'supervision'])
            ->middleware('role:administrateur');
        Route::post('/compositions/{uuid}/incidents', [CompositionsController::class, 'signalerIncident'])
            ->middleware('role:apprenant');
    });

    // ---------- 14. Endpoint interne : secret partagé uniquement (pas de contexte utilisateur) ----------
    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/eligibilite-document/{apprenant_uuid}', [InterneController::class, 'eligibiliteDocument']);
    });
});
