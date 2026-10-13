<?php

use App\Http\Controllers\AbonnementController;
use App\Http\Controllers\DecaissementController;
use App\Http\Controllers\FactureController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\PaiementController;
use App\Http\Controllers\RapportController;
use Illuminate\Support\Facades\Route;

/**
 * Endpoints : Tableau 6 du CDC Finances. Réponses : uuid uniquement.
 *
 * Sécurité :
 *  - auth.tenant : contexte Gateway obligatoire (secret interne + tenant + utilisateur + rôle) ;
 *  - role:...    : Tableau 1. "Comptable" = rôle plateforme `personnel` (les permissions fines
 *                  par fonction viendront de identite.role_permissions) ;
 *  - webhooks    : publics mais signature de l'agrégateur obligatoire, jamais de contexte utilisateur ;
 *  - /interne/*  : secret interne uniquement.
 *  - Séparation des tâches (initiateur ≠ validateur) contrôlée dans le service, pas seulement ici.
 */
Route::prefix('v1')->group(function () {

    Route::middleware(['auth.tenant', 'throttle:api'])->group(function () {
        Route::post('/factures', [FactureController::class, 'creer'])
            ->middleware('role:administrateur,personnel');

        Route::post('/paiements/initier', [PaiementController::class, 'initier'])
            ->middleware(['role:parent,administrateur,personnel', 'throttle:paiement']);

        Route::post('/decaissements', [DecaissementController::class, 'initier'])
            ->middleware('role:personnel,administrateur');
        Route::put('/decaissements/{uuid}/valider', [DecaissementController::class, 'valider'])
            ->middleware('role:administrateur')->whereUuid('uuid');
        Route::put('/decaissements/{uuid}/rejeter', [DecaissementController::class, 'rejeter'])
            ->middleware('role:administrateur')->whereUuid('uuid');

        Route::get('/abonnements/{tenant_uuid}', [AbonnementController::class, 'statut'])
            ->middleware('role:administrateur,super_admin')->whereUuid('tenant_uuid');
        Route::post('/abonnements/{tenant_uuid}/paiement', [AbonnementController::class, 'payer'])
            ->middleware('role:administrateur')->whereUuid('tenant_uuid');

        Route::get('/rapports/etablissement/{tenant_uuid}', [RapportController::class, 'parEtablissement'])
            ->middleware('role:administrateur,personnel')->whereUuid('tenant_uuid');
    });

    Route::post('/webhooks/fedapay', [PaiementController::class, 'webhookFedapay'])
        ->middleware(['throttle:webhook', 'webhook:fedapay']);
    Route::post('/webhooks/kkiapay', [PaiementController::class, 'webhookKkiapay'])
        ->middleware(['throttle:webhook', 'webhook:kkiapay']);

    Route::middleware('secret.interne')->prefix('interne')->group(function () {
        Route::get('/solde/{apprenant_uuid}', [InterneController::class, 'soldeApprenant'])->whereUuid('apprenant_uuid');
        Route::get('/revenus-consolides', [InterneController::class, 'revenusConsolides']);
    });
});
