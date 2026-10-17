<?php

use App\Http\Controllers\AffectationsController;
use App\Http\Controllers\CongesController;
use App\Http\Controllers\ContratsController;
use App\Http\Controllers\DroitsRhController;
use App\Http\Controllers\GradesController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\PersonnelController;
use App\Http\Controllers\PersonnelRolesRhController;
use App\Http\Controllers\RolesRhController;
use Illuminate\Support\Facades\Route;

/*
| Base : /v1 (pas de préfixe /api). Réponses : uuid uniquement, jamais d'identifiant interne.
|
| Sécurité, dans cet ordre :
|  1. auth.tenant : contexte Gateway (X-Internal-Secret + X-Tenant-Id + X-User-Id + X-User-Role), fail closed ;
|  2. role:...    : la gestion RH est réservée à l'administrateur de l'établissement.
|
| Le Super Administrateur de la plateforme n'accède à aucune donnée individuelle du personnel.
| Les endpoints /interne/* sont réservés aux autres microservices (X-Internal-Secret), jamais à l'UI.
*/

Route::get('/health', fn () => response()->json([
    'success' => true,
    'service' => 'api-rh',
    'statut' => 'ok',
    'horodatage' => now()->toIso8601String(),
]));

// Contrat OpenAPI 3 (même convention que les autres microservices : GET /docs public, sans donnée).
Route::get('/docs', fn () => response((string) file_get_contents(base_path('docs/openapi.json')), 200, ['Content-Type' => 'application/json']));

Route::prefix('v1')->group(function () {

    Route::middleware(['auth.tenant', 'throttle:api'])->group(function () {

        // Personnel
        Route::get('/personnel', [PersonnelController::class, 'index'])->middleware('role:administrateur,personnel');
        Route::post('/personnel', [PersonnelController::class, 'creer'])->middleware('role:administrateur');
        Route::get('/personnel/{personnel}', [PersonnelController::class, 'voir'])->middleware('role:administrateur,personnel');
        Route::put('/personnel/{personnel}', [PersonnelController::class, 'modifier'])->middleware('role:administrateur');
        Route::post('/personnel/{personnel}/statut', [PersonnelController::class, 'changerStatut'])
            ->middleware(['role:administrateur', 'throttle:sensible']);
        Route::get('/personnel/{personnel}/affectations', [PersonnelController::class, 'affectations'])
            ->middleware('role:administrateur,personnel');

        // Rôles RH personnalisés (CDC RH §5.7 / §7.7-7.9)
        Route::get('/roles-rh', [RolesRhController::class, 'index'])->middleware('role:administrateur');
        Route::post('/roles-rh', [RolesRhController::class, 'creer'])->middleware('role:administrateur');
        Route::get('/roles-rh/{roleRh}', [RolesRhController::class, 'voir'])->middleware('role:administrateur');
        Route::put('/roles-rh/{roleRh}', [RolesRhController::class, 'modifier'])->middleware('role:administrateur');
        Route::patch('/roles-rh/{roleRh}/modules', [RolesRhController::class, 'definirModules'])->middleware('role:administrateur');
        Route::post('/roles-rh/{roleRh}/archiver', [RolesRhController::class, 'archiver'])
            ->middleware(['role:administrateur', 'throttle:sensible']);

        // Attribution des rôles RH au personnel
        Route::get('/personnel/{personnel}/roles-rh', [PersonnelRolesRhController::class, 'index'])
            ->middleware('role:administrateur');
        Route::post('/personnel/{personnel}/roles-rh', [PersonnelRolesRhController::class, 'attribuer'])
            ->middleware('role:administrateur');
        Route::post('/personnel/{personnel}/roles-rh/{roleRh}/retirer', [PersonnelRolesRhController::class, 'retirer'])
            ->middleware('role:administrateur');

        // Moteur de rôles RH : fonctions accessibles à l'utilisateur courant
        Route::get('/rh/mes-fonctions', [DroitsRhController::class, 'mesFonctions'])
            ->middleware('role:administrateur,personnel,enseignant');

        // Grades / corps
        Route::get('/grades', [GradesController::class, 'index'])->middleware('role:administrateur,personnel');
        Route::post('/grades', [GradesController::class, 'creer'])->middleware('role:administrateur');
        Route::put('/grades/{grade}', [GradesController::class, 'modifier'])->middleware('role:administrateur');

        // Contrats
        Route::get('/contrats', [ContratsController::class, 'index'])->middleware('role:administrateur,personnel');
        Route::post('/contrats', [ContratsController::class, 'creer'])->middleware('role:administrateur');
        Route::put('/contrats/{contrat}', [ContratsController::class, 'modifier'])->middleware('role:administrateur');
        Route::post('/contrats/{contrat}/cloturer', [ContratsController::class, 'cloturer'])
            ->middleware(['role:administrateur', 'throttle:sensible']);

        // Affectations (source de vérité de la règle 5)
        Route::get('/affectations', [AffectationsController::class, 'index'])->middleware('role:administrateur,personnel');
        Route::post('/affectations', [AffectationsController::class, 'creer'])->middleware('role:administrateur');
        Route::get('/affectations/{affectation}', [AffectationsController::class, 'voir'])->middleware('role:administrateur,personnel');
        Route::put('/affectations/{affectation}', [AffectationsController::class, 'modifier'])->middleware('role:administrateur');
        Route::post('/affectations/{affectation}/cloturer', [AffectationsController::class, 'cloturer'])
            ->middleware(['role:administrateur', 'throttle:sensible']);

        // Congés
        Route::get('/conges', [CongesController::class, 'index'])->middleware('role:administrateur,personnel');
        Route::post('/conges', [CongesController::class, 'creer'])->middleware('role:administrateur,personnel,enseignant');
        Route::get('/conges/{conge}', [CongesController::class, 'voir'])->middleware('role:administrateur,personnel');
        Route::put('/conges/{conge}/traiter', [CongesController::class, 'traiter'])
            ->middleware(['role:administrateur', 'throttle:sensible']);
    });

    // Interne : secret partagé uniquement (E-learning, Évaluations, Vie scolaire).
    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/personnel', [InterneController::class, 'personnel']);
        Route::get('/personnel/utilisateur/{utilisateur_uuid}', [InterneController::class, 'personnelParUtilisateur']);
        Route::get('/affectations', [InterneController::class, 'affectations']);
        Route::get('/affectations/verifier', [InterneController::class, 'verifierAffectation']);
    });
});
