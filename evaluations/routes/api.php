<?php

use App\Http\Controllers\BulletinsController;
use App\Http\Controllers\ContestationsController;
use App\Http\Controllers\EvaluationsController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\MatieresController;
use App\Http\Controllers\NotesController;
use App\Http\Controllers\ParametresController;
use App\Http\Controllers\PeriodesController;
use Illuminate\Support\Facades\Route;

/*
| Base : /v1 (pas de préfixe /api). Réponses : uuid uniquement, jamais d'identifiant interne.
|
| Sécurité, dans cet ordre :
|  1. auth.tenant : contexte Gateway (X-Internal-Secret + X-Tenant-Id + X-User-Id + X-User-Role), fail closed ;
|  2. role:...    : matrice du CDC (Tableau 1) ;
|  3. ControleAcces dans les services : affectation de l'enseignant, enfant rattaché, dossier propre.
| super_admin et personnel n'ont accès à aucune note individuelle.
| Compositions en ligne (phase 2) : routes non exposées tant que le contrat E-learning n'est pas validé.
*/

Route::get('/health', fn () => response()->json([
    'success' => true,
    'service' => 'api-evaluations',
    'statut' => 'ok',
    'horodatage' => now()->toIso8601String(),
]));

// Contrat OpenAPI 3 (même convention que les autres microservices : GET /docs public, sans donnée).
Route::get('/docs', fn () => response((string) file_get_contents(base_path('docs/openapi.json')), 200, ['Content-Type' => 'application/json']));

Route::prefix('v1')->group(function () {

    Route::middleware(['auth.tenant', 'throttle:api'])->group(function () {

        // Barèmes et règles de notation
        Route::get('/grilles', [ParametresController::class, 'grilles'])->middleware('role:administrateur,enseignant');
        Route::post('/grilles', [ParametresController::class, 'creerGrille'])->middleware('role:administrateur');
        Route::get('/parametres-notation/{cycle}', [ParametresController::class, 'voir'])->middleware('role:administrateur,enseignant');
        Route::put('/parametres-notation/{cycle}', [ParametresController::class, 'enregistrer'])->middleware('role:administrateur');
        Route::post('/modeles-bulletin', [ParametresController::class, 'modele'])->middleware('role:administrateur');

        // Matières et coefficients
        Route::get('/matieres', [MatieresController::class, 'index'])->middleware('role:administrateur,enseignant');
        Route::post('/matieres', [MatieresController::class, 'creer'])->middleware('role:administrateur');
        Route::put('/matieres/{matiere}', [MatieresController::class, 'modifier'])->middleware('role:administrateur');
        Route::put('/matieres/{matiere}/coefficients', [MatieresController::class, 'coefficients'])->middleware('role:administrateur');

        // Périodes
        Route::get('/periodes', [PeriodesController::class, 'index'])->middleware('role:administrateur,enseignant,apprenant,parent');
        Route::post('/periodes', [PeriodesController::class, 'creer'])->middleware('role:administrateur');
        Route::post('/periodes/{periode}/cloturer', [PeriodesController::class, 'cloturer'])->middleware(['role:administrateur', 'throttle:sensible']);

        // Évaluations
        Route::get('/evaluations', [EvaluationsController::class, 'index'])->middleware('role:administrateur,enseignant');
        Route::post('/evaluations', [EvaluationsController::class, 'creer'])->middleware('role:administrateur,enseignant');
        Route::post('/evaluations/{evaluation}/verrouiller', [EvaluationsController::class, 'verrouiller'])->middleware('role:enseignant');

        // Notes
        Route::post('/notes', [NotesController::class, 'saisir'])->middleware('role:enseignant');
        Route::get('/notes/classe/{classe_uuid}', [NotesController::class, 'parClasse'])->middleware('role:administrateur,enseignant');
        Route::put('/notes/{note}/corriger', [NotesController::class, 'corriger'])->middleware('role:administrateur');

        // Bulletins et classements
        Route::get('/bulletins/apprenant/{apprenant_uuid}', [BulletinsController::class, 'consulter'])->middleware('role:administrateur,enseignant,apprenant,parent');
        Route::get('/bulletins/apprenant/{apprenant_uuid}/pdf', [BulletinsController::class, 'pdf'])->middleware('role:administrateur,enseignant,apprenant,parent');
        Route::get('/classements/classe/{classe_uuid}', [BulletinsController::class, 'classement'])->middleware('role:administrateur,enseignant');

        // Contestations
        Route::get('/contestations', [ContestationsController::class, 'index'])->middleware('role:administrateur,enseignant,apprenant,parent');
        Route::post('/contestations', [ContestationsController::class, 'ouvrir'])->middleware(['role:apprenant,parent', 'throttle:sensible']);
        Route::put('/contestations/{contestation}/traiter', [ContestationsController::class, 'traiter'])->middleware('role:administrateur,enseignant');
    });

    // Interne : secret partagé uniquement (Demandes administratives, E-learning), X-Tenant-Id obligatoire.
    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/eligibilite-document/{apprenant_uuid}', [InterneController::class, 'eligibiliteDocument']);
        // E-learning : report des notes de devoirs et de quiz (une épreuve par activité).
        Route::post('/notes-elearning', [InterneController::class, 'reporterNoteElearning']);
    });
});
