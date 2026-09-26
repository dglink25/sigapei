<?php

use Illuminate\Support\Str;

return [
    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'sigapei'),
            'username' => env('DB_USERNAME', 'sigapei_owner'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            // "search_path" fait office de schema par defaut pour ce microservice :
            // toutes les tables de ce depot vivent dans le schema "etablissements"
            // de la base UNIQUE partagee avec les 11 autres microservices.
            'search_path' => env('DB_SCHEMA', 'etablissements'),
            'sslmode' => env('DB_SSLMODE', 'prefer'),
        ],
    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    'redis' => [
        'client' => 'predis',
        'options' => [
            'cluster' => 'redis',
            'prefix' => 'etablissements:',
        ],
        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD') === 'null' ? null : env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '1'),
        ],
        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD') === 'null' ? null : env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', env('REDIS_DB', '1')),
        ],
    ],
];
