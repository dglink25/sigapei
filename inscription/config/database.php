<?php

return [
    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', 'ep-raspy-brook-b46yo20b-pooler.c-6.us-east-2.aws.neon.tech'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'neondb'),
            'username' => env('DB_USERNAME', ''),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            // Schema dedie Neon pour le microservice Inscription dans la base unique
            'search_path' => env('DB_SCHEMA', 'inscription'),
            'sslmode' => env('DB_SSLMODE', 'require'),
            'options' => env('DB_OPTIONS', '--endpoint=ep-raspy-brook-b46yo20b'),
        ],
    ],

    // Table de suivi des migrations dediee pour eviter tout conflit sur la base unique partagee
    'migrations' => [
        'table' => 'migrations_' . env('DB_SCHEMA', 'inscription'),
        'update_date_on_publish' => true,
    ],

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),
        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => 'inscription:',
        ],
        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '2'),
        ],
    ],
];
