<?php

/**
 * Configuration des appels inter-microservices via les API internes.
 *
 * Règle n°1 : un microservice ne lit jamais les tables d'un autre
 * microservice. Les échanges passent par les endpoints `/interne/*`
 * protégés par le secret interne partagé (Règle n°3).
 *
 * Les URL pointent par défaut sur les ports attribués dans le tableau des
 * microservices du README racine. En production, les surcharger par variable
 * d'environnement.
 */
return [

    'microservices' => [
        'urls' => [
            'identite'      => env('URL_SERVICE_IDENTITE',      'http://localhost:4001'),
            'etablissements'=> env('URL_SERVICE_ETABLISSEMENTS','http://localhost:4002'),
            'inscription'   => env('URL_SERVICE_INSCRIPTION',   'http://localhost:4003'),
            'scolarite'     => env('URL_SERVICE_SCOLARITE',     'http://localhost:4004'),
            'vie-scolaire'  => env('URL_SERVICE_VIE_SCOLAIRE',  'http://localhost:4005'),
        ],
        'timeout' => (int) env('MICROSERVICES_TIMEOUT', 5),
    ],

    'interne' => [
        'header' => 'X-Internal-Secret',
        // Règle n°3 : secret partagé sur toute la plateforme, fourni par le
        // chef de projet. Ne jamais générer de valeur propre ici.
        'secret' => env('INTERNAL_API_SECRET'),
    ],

];
