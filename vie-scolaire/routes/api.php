<?php

use App\Alertes\AlerteController;
use App\Common\DossierVieScolaireController;
use App\Discipline\IncidentController;
use App\Presences\PresenceController;
use Illuminate\Support\Facades\Route;

/**
 * Tous les endpoints sont exposes sous /v1 (section 8 du CDC), derriere
 * la passerelle API.
 *
 * Regle n°5 - JWT : ce microservice ne verifie AUCUNE signature de jeton.
 * Le seul possesseur de JWT_ACCESS_SECRET est le microservice identite.
 * L'identite de l'appelant arrive par les entetes de la passerelle
 * (X-Tenant-Id, X-User-Id, X-User-Role), que le middleware `tenant`
 * transforme en TenantContext. Les appels entre microservices qui ne
 * passent pas par la passerelle utilisent `GET identite/interne/introspection`
 * avec X-Internal-Secret.
 *
 * Regle n°4 - CAPTCHA : toute route acceptant une soumission libre porte
 * le middleware `captcha`.
 *
 * Les endpoints /cantine/* et /transport/* sont volontairement absents :
 * leur activation est differee a la version 2 (section 8).
 */
Route::prefix('v1')->middleware(['tenant'])->group(function () {

    // Lectures et ecritures soumises a verification CAPTCHA.
    Route::middleware(['captcha'])->group(function () {
        Route::post('/presences', [PresenceController::class, 'store']);
        Route::put('/presences/{uuid}', [PresenceController::class, 'update']);

        Route::post('/incidents', [IncidentController::class, 'store']);
        Route::post('/incidents/{uuid}/sanction', [IncidentController::class, 'storeSanction']);
    });

    Route::get('/presences', [PresenceController::class, 'index']);

    Route::get('/apprenants/{uuid}/absences/synthese', [PresenceController::class, 'syntheseAbsences']);
    Route::get('/apprenants/{uuid}/dossier-vie-scolaire', [DossierVieScolaireController::class, 'show']);

    Route::get('/incidents', [IncidentController::class, 'index']);
});

/**
 * Regle n°3 - surface interne : appelee uniquement par la passerelle ou par
 * un autre microservice, jamais par un client final.
 *
 * Le secret partage `X-Internal-Secret` est verifie AVANT toute resolution de
 * contexte : un appelant non autorise est rejete sans qu'aucune requete ne
 * soit preparee. Le middleware `tenant` est ensuite applique a la main, car
 * l'appelant interne transmet lui-meme le tenant concern
 * (`X-Tenant-Id`), et non la passerelle.
 */
Route::prefix('v1/interne')
    ->middleware(['interne', 'tenant'])
    ->group(function () {
        Route::get('/alertes-absences', [AlerteController::class, 'index']);
    });
