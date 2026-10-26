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

    // Microservice Identité : résolution / alignement des comptes utilisateurs.
    'identite' => [
        'url' => env('IDENTITE_URL', 'http://identite:4001'),
        'timeout' => (int) env('IDENTITE_TIMEOUT', 5),
    ],

    // Microservice Établissements : référentiel des établissements (tenants).
    'etablissements' => [
        'url' => env('ETABLISSEMENTS_URL', 'http://api-etablissements:4002'),
        'timeout' => (int) env('ETABLISSEMENTS_TIMEOUT', 5),
    ],
];
