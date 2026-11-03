<?php

/**
 * Services externes. Lu via config() et non env() dans le code : env() renvoie null
 * après "php artisan config:cache" (cas de l'image Docker de production).
 */
return [
    // Règle n°3 : secret interne partagé par toute la plateforme (jamais généré localement).
    'interne' => [
        'secret' => env('INTERNAL_API_SECRET'),
        'header' => 'X-Internal-Secret',
    ],

    // Microservice Scolarité : appels HTTP /v1/interne/... (jamais de jointure SQL inter-schémas).
    'scolarite' => [
        'url' => env('SCOLARITE_URL', 'http://api-scolarite:4004'),
        'timeout' => (int) env('SCOLARITE_TIMEOUT', 5),
    ],

    // Identité : introspection du jeton du front (règle n°5, cas 2 : appel direct sans Gateway).
    'identite' => [
        'url' => env('IDENTITE_URL', 'http://api-identite:4001'),
        'timeout' => 5,
        'cache_secondes' => 60,
        // Code de ce module dans le catalogue des services d'Identité (accès par rôle et par établissement).
        'code_service' => env('IDENTITE_CODE_SERVICE', 'evaluations'),
    ],

    // Établissements : correspondance uuid de l'établissement -> identifiant tenant (tenant_id).
    'etablissements' => [
        'url' => env('ETABLISSEMENTS_URL', 'http://api-etablissements:4002'),
        'timeout' => 5,
    ],

    // Microservice RH : source de vérité de `rh.affectations` (règle 5), son unique propriétaire.
    'rh' => [
        'url' => env('RH_URL', 'http://api-rh:4009'),
        'timeout' => (int) env('RH_TIMEOUT', 5),
    ],

    // Microservice E-learning (phase 2) : appel API explicite avec jeton de service.
    'elearning' => [
        'url' => env('ELEARNING_URL', ''),
        'service_token' => env('ELEARNING_SERVICE_TOKEN', ''),
    ],
];
