<?php

/**
 * Configuration du microservice Vie scolaire.
 *
 * Le seuil d'alerte n'est pas fixe par le cahier des charges plateforme
 * (section 49) : la valeur ci-dessous est la valeur PAR DEFAUT au niveau
 * plateforme, ajustable ensuite au niveau etablissement conformement a la
 * regle de gestion enoncee en section 9 du CDC microservice ("il ne peut
 * etre desactive, seulement ajuste"). Reste a valider avec l'equipe.
 */

return [

    'absences' => [
        // Nombre d'absences sur la periode glissante au-dela duquel
        // le censeur est alerte (AlerteAbsenceService).
        'seuil_defaut' => (int) env('VIESCOLAIRE_SEUIL_ABSENCES_DEFAUT', 4),

        // Fenetre glissante, en jours, sur laquelle les absences
        // sont agregees pour le calcul du seuil.
        'periode_glissante_jours' => (int) env('VIESCOLAIRE_PERIODE_GLISSANTE_JOURS', 30),
    ],

    'presences' => [
        // Delai, en heures, pendant lequel l'enseignant qui a saisi
        // une presence peut la corriger lui-meme. Au-dela, seuls le
        // censeur ou l'administrateur peuvent corriger (section 9).
        'fenetre_correction_enseignant_heures' => (int) env('VIESCOLAIRE_CORRECTION_ENSEIGNANT_HEURES', 24),
    ],

    // Schemas externes consultes par jointure directe (section 7.2 / 11).
    // Aucune donnee n'est dupliquee depuis ces schemas.
    'schemas_externes' => [
        'scolarite' => env('DB_SCHEMA_SCOLARITE', 'scolarite'),
        'rh' => env('DB_SCHEMA_RH', 'rh'),
    ],

    // Modules V2+ dont la structure de donnees est posee des ce lot
    // mais qui ne sont pas exposes par API (section 2.4 / 7.1).
    'modules_reserves' => ['cantine', 'transport'],

];
