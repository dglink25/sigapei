<?php

use App\Http\Controllers\AccueilController;
use App\Http\Controllers\ConfigurationAcademiqueController;
use App\Http\Controllers\CorrectionController;
use App\Http\Controllers\DemandeCycleController;
use App\Http\Controllers\DocsController;
use App\Http\Controllers\EtablissementController;
use App\Http\Controllers\GeoController;
use App\Http\Controllers\InterneController;
use App\Http\Controllers\MonEtablissementController;
use App\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;


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

        // ── Demandes d'extension de cycle (Super Administrateur) ──
        Route::get('/demandes-cycle',                   [DemandeCycleController::class, 'listerToutesDemandes']);
        Route::post('/demandes-cycle/{uuid}/accepter',  [DemandeCycleController::class, 'accepter']);
        Route::post('/demandes-cycle/{uuid}/refuser',   [DemandeCycleController::class, 'refuser']);

        // --- Profil de l'etablissement, modifie par SON administrateur (contexte pose par la Gateway) ---
        Route::middleware('contexte.tenant')->prefix('mon-etablissement')->group(function () {
            Route::get('/', [MonEtablissementController::class, 'afficher']);
            Route::patch('/', [MonEtablissementController::class, 'modifier']);
            Route::post('/logo', [MonEtablissementController::class, 'remplacerLogo']);

            // ── Configuration académique (administrateur de l'établissement) ──
            $cfg = 'configuration';

            // Années académiques
            Route::get("/{$cfg}/annees",                  [ConfigurationAcademiqueController::class, 'listerAnnees']);
            Route::post("/{$cfg}/annees",                 [ConfigurationAcademiqueController::class, 'creerAnnee']);
            Route::get("/{$cfg}/annees/{uuid}",           [ConfigurationAcademiqueController::class, 'afficherAnnee']);
            Route::patch("/{$cfg}/annees/{uuid}",         [ConfigurationAcademiqueController::class, 'modifierAnnee']);
            Route::post("/{$cfg}/annees/{uuid}/suspendre",[ConfigurationAcademiqueController::class, 'suspendreAnnee']);
            Route::post("/{$cfg}/annees/{uuid}/reactiver",[ConfigurationAcademiqueController::class, 'reactiverAnnee']);

            // Cycles actifs
            Route::get("/{$cfg}/cycles",                  [ConfigurationAcademiqueController::class, 'listerCycles']);
            Route::post("/{$cfg}/cycles",                 [ConfigurationAcademiqueController::class, 'creerOuMettreAJourCycle']);

            // Subdivisions
            Route::get("/{$cfg}/subdivisions",            [ConfigurationAcademiqueController::class, 'listerSubdivisions']);
            Route::post("/{$cfg}/subdivisions",           [ConfigurationAcademiqueController::class, 'creerSubdivision']);
            Route::patch("/{$cfg}/subdivisions/{uuid}",   [ConfigurationAcademiqueController::class, 'modifierSubdivision']);

            // Niveaux
            Route::get("/{$cfg}/niveaux",                 [ConfigurationAcademiqueController::class, 'listerNiveaux']);
            Route::post("/{$cfg}/niveaux",                [ConfigurationAcademiqueController::class, 'creerNiveau']);
            Route::patch("/{$cfg}/niveaux/{uuid}",        [ConfigurationAcademiqueController::class, 'modifierNiveau']);

            // Séries / filières
            Route::get("/{$cfg}/series",                  [ConfigurationAcademiqueController::class, 'listerSeries']);
            Route::post("/{$cfg}/series",                 [ConfigurationAcademiqueController::class, 'creerSerie']);
            Route::patch("/{$cfg}/series/{uuid}",         [ConfigurationAcademiqueController::class, 'modifierSerie']);

            // Classes concrètes
            Route::get("/{$cfg}/classes",                 [ConfigurationAcademiqueController::class, 'listerClasses']);
            Route::post("/{$cfg}/classes",                [ConfigurationAcademiqueController::class, 'creerClasse']);
            Route::patch("/{$cfg}/classes/{uuid}",        [ConfigurationAcademiqueController::class, 'modifierClasse']);

            // Cohortes universitaires
            Route::get("/{$cfg}/cohortes",                [ConfigurationAcademiqueController::class, 'listerCohortes']);
            Route::post("/{$cfg}/cohortes",               [ConfigurationAcademiqueController::class, 'creerCohorte']);

            // Matières avec coefficient
            Route::get("/{$cfg}/matieres",                [ConfigurationAcademiqueController::class, 'listerMatieres']);
            Route::post("/{$cfg}/matieres",               [ConfigurationAcademiqueController::class, 'creerMatiere']);
            Route::patch("/{$cfg}/matieres/{uuid}",       [ConfigurationAcademiqueController::class, 'modifierMatiere']);
            Route::get("/{$cfg}/matieres/{uuid}/propagation", [ConfigurationAcademiqueController::class, 'previewPropagation']);
            Route::post("/{$cfg}/matieres/{uuid}/propager",   [ConfigurationAcademiqueController::class, 'propagerMatiere']);

            // ── Demandes d'extension de cycle (administrateur de l'établissement) ──
            Route::get('/demandes-cycle',                   [DemandeCycleController::class, 'listerMesDemandes']);
            Route::post('/demandes-cycle',                  [DemandeCycleController::class, 'soumettre']);
            Route::delete('/demandes-cycle/{uuid}',         [DemandeCycleController::class, 'annuler']);
        });
    });
});
