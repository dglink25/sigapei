<?php

use App\Http\Controllers\DocsController;
use App\Http\Controllers\DocumentsController;
use App\Http\Controllers\FacturesController;
use App\Http\Controllers\FormulesController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\MesFinancesController;
use App\Http\Controllers\PaiementsController;
use App\Http\Controllers\ParametresController;
use App\Http\Controllers\RapportsController;
use App\Http\Controllers\ReglementsController;
use Illuminate\Support\Facades\Route;

/**
 * API Finances (base /v1, sans préfixe /api). Ressources désignées par uuid uniquement.
 *
 * Sécurité :
 *  - auth.tenant : jeton Identité (appel direct du front) ou contexte Gateway signé ; accès au module vérifié ;
 *  - droits : grille rôle x action de l'établissement (services/Gouvernance), contrôlée dans chaque action ;
 *  - documents PDF : lien relatif signé et court, délivré par une route authentifiée ;
 *  - /interne/* : secret interne uniquement (Gateway, Paiement, Scolarité, Demandes).
 * L'argent réel n'est jamais manipulé ici : le microservice Paiement exécute les paiements en ligne.
 */
Route::get('/docs', [DocsController::class, 'interfaceSwagger']);
Route::get('/docs-json', [DocsController::class, 'specification']);

Route::prefix('v1')->group(function () {
    Route::middleware(['auth.tenant', 'throttle:api'])->group(function () {
        Route::get('/mes-droits', [MesFinancesController::class, 'droits']);
        Route::get('/mes-finances', [MesFinancesController::class, 'famille']);

        Route::get('/formules', [FormulesController::class, 'index']);
        Route::get('/formules/applicables', [FormulesController::class, 'applicables']);
        Route::post('/formules', [FormulesController::class, 'creer']);
        Route::patch('/formules/{formule}', [FormulesController::class, 'modifier'])->whereUuid('formule');

        Route::get('/classes/{classe}/apprenants', [FacturesController::class, 'apprenantsDeClasse'])->whereUuid('classe');
        Route::get('/factures', [FacturesController::class, 'index']);
        Route::post('/factures', [FacturesController::class, 'emettre'])->middleware('throttle:sensible');
        Route::post('/factures/classe', [FacturesController::class, 'emettrePourClasse'])->middleware('throttle:sensible');
        Route::get('/factures/{facture}', [FacturesController::class, 'voir'])->whereUuid('facture');
        Route::post('/factures/{facture}/annuler', [FacturesController::class, 'annuler'])->whereUuid('facture')->middleware('throttle:sensible');
        Route::get('/factures/{facture}/pdf', [FacturesController::class, 'pdf'])->whereUuid('facture');

        Route::get('/factures/{facture}/paiements', [PaiementsController::class, 'historique'])->whereUuid('facture');
        Route::post('/factures/{facture}/paiements', [PaiementsController::class, 'initier'])->whereUuid('facture')->middleware('throttle:paiement');
        Route::get('/paiements/{paiement}', [PaiementsController::class, 'voir'])->whereUuid('paiement');

        Route::get('/reglements', [ReglementsController::class, 'index']);
        Route::post('/factures/{facture}/reglements', [ReglementsController::class, 'saisir'])->whereUuid('facture')->middleware('throttle:sensible');
        Route::post('/reglements/{reglement}/valider', [ReglementsController::class, 'valider'])->whereUuid('reglement')->middleware('throttle:sensible');
        Route::post('/reglements/{reglement}/rejeter', [ReglementsController::class, 'rejeter'])->whereUuid('reglement')->middleware('throttle:sensible');
        Route::get('/reglements/{reglement}/recu', [ReglementsController::class, 'recu'])->whereUuid('reglement');

        Route::get('/apprenants/{apprenant}/solde', [RapportsController::class, 'soldeApprenant'])->whereUuid('apprenant');
        Route::get('/rapports/synthese', [RapportsController::class, 'synthese']);
        Route::get('/journal', [RapportsController::class, 'journal']);

        Route::get('/parametres', [ParametresController::class, 'lire']);
        Route::put('/parametres', [ParametresController::class, 'enregistrer']);
        Route::get('/gouvernance', [ParametresController::class, 'grille']);
        Route::put('/gouvernance/{role}', [ParametresController::class, 'definirRole'])->where('role', '[a-z][a-z0-9_-]{1,63}');
    });

    Route::middleware(['signed:relative', 'throttle:telechargement'])->prefix('documents')->group(function () {
        Route::get('/factures/{facture}', [DocumentsController::class, 'facture'])->whereUuid('facture')->name('documents.facture');
        Route::get('/recus/{reglement}', [DocumentsController::class, 'recu'])->whereUuid('reglement')->name('documents.recu');
    });

    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/solde/{apprenant}', [InterneController::class, 'solde'])->whereUuid('apprenant');
        Route::get('/apprenants/paiements', [InterneController::class, 'situationApprenant']);
        Route::post('/paiements/notification', [InterneController::class, 'notificationPaiement']);
    });
});
