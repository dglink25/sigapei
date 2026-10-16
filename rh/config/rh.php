<?php

/**
 * Paramètres propres au microservice RH.
 * Valeurs par défaut au niveau plateforme, surchargeables par variables d'environnement.
 */
return [
    // Vue métier : types de personnel acceptés (liste fermée).
    'types_personnel' => [
        'enseignant',
        'administratif',
        'direction',
        'surveillant',
        'support',
    ],

    // Vue métier : statuts d'un membre du personnel.
    'statuts_personnel' => [
        'actif',
        'suspendu',
        'inactif',
        'retraite',
    ],

    // Rôles RH personnalisés (CDC RH §5.7 / §7.7-7.9).
    'statuts_role_rh' => [
        'actif',
        'archive',
    ],

    // Fonctions du module RH qu'un rôle personnalisé peut accorder (CDC RH §7.8).
    'fonctions_rh' => [
        'dossiers',
        'affectations',
        'charges_horaires',
        'conges',
        'evaluations',
        'contrats_intervenants',
    ],

    // Congés : nombre de jours ouvrables maximum par défaut (sans solde paramétré).
    'conges' => [
        'jours_max_par_demande' => (int) env('RH_CONGES_JOURS_MAX', 90),
    ],
];
