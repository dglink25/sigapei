<?php

/**
 * Services externes. Toujours lus via config() (env() renvoie null après config:cache).
 */
return [
    // Règle n°3 : secret interne partagé par toute la plateforme (jamais généré localement).
    'interne' => [
        'secret' => env('INTERNAL_API_SECRET'),
        'header' => 'X-Internal-Secret',
    ],

    // Identité : vérification du jeton du front et accès au module (code du service au catalogue).
    'identite' => [
        'url' => env('IDENTITE_URL', 'http://api-identite:4001'),
        'timeout' => 5,
        'code_service' => env('IDENTITE_CODE_SERVICE', 'finances'),
    ],

    // Scolarité : dossiers des apprenants (classe, parents rattachés).
    'scolarite' => [
        'url' => env('SCOLARITE_URL', 'http://api-scolarite:4004'),
        'timeout' => 5,
    ],

    // Paiement : seul service qui manipule l'argent réel (agrégateurs, portefeuilles, grand livre).
    'paiement' => [
        'url' => env('PAIEMENT_URL', 'http://api-paiement:4010'),
        'timeout' => 10,
    ],

    // Front de la plateforme : seules adresses de retour acceptées après un paiement en ligne (pas de redirection ouverte).
    'front' => [
        'origines' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ORIGINS', ''))))),
    ],

    // RabbitMQ : publication des événements (échange sigapei.events).
    'rabbitmq' => [
        'host' => env('RABBITMQ_HOST'),
        'port' => (int) env('RABBITMQ_PORT', 5672),
        'user' => env('RABBITMQ_USER'),
        'password' => env('RABBITMQ_PASSWORD'),
        'vhost' => env('RABBITMQ_VHOST', '/'),
    ],
];
