<?php

use App\Alertes\AlerteController;
use App\Common\DossierVieScolaireController;
use App\Common\Middlewares\ResolveTenantContext;
use App\Discipline\IncidentController;
use App\Presences\PresenceController;
use Illuminate\Support\Facades\Route;

/**
 * Tous les endpoints sont exposes sous /v1 (section 8 du CDC), derriere
 * la passerelle API qui a deja verifie le JWT et le statut du tenant
 * (CDC plateforme, section 10.1). ResolveTenantContext extrait ensuite
 * les claims (tenant_id, sub, role) pour alimenter TenantScope.
 *
 * Les endpoints /cantine/* et /transport/* sont volontairement absents :
 * leur activation est differee a la version 2 (section 8).
 */
Route::prefix('v1')->middleware([ResolveTenantContext::class])->group(function () {

    Route::post('/presences', [PresenceController::class, 'store']);
    Route::get('/presences', [PresenceController::class, 'index']);
    Route::put('/presences/{uuid}', [PresenceController::class, 'update']);

    Route::get('/apprenants/{uuid}/absences/synthese', [PresenceController::class, 'syntheseAbsences']);
    Route::get('/apprenants/{uuid}/dossier-vie-scolaire', [DossierVieScolaireController::class, 'show']);

    Route::post('/incidents', [IncidentController::class, 'store']);
    Route::get('/incidents', [IncidentController::class, 'index']);
    Route::post('/incidents/{uuid}/sanction', [IncidentController::class, 'storeSanction']);

    Route::get('/interne/alertes-absences', [AlerteController::class, 'index']);
});
