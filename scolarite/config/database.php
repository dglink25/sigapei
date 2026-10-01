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
            // Schema dedie Neon pour le microservice Scolarite dans la base unique
            'search_path' => env('DB_SCHEMA', 'scolarite'),
            'sslmode' => env('DB_SSLMODE', 'require'),
            // Contournement SNI pour libpq ancienne (XAMPP / Docker sans SNI)
            // NeonServiceProvider injecte cet endpoint dans le DSN PDO via NeonPostgresConnector
            'neon_endpoint' => env('DB_ENDPOINT', 'ep-raspy-brook-b46yo20b'),
            'application_name' => env('APP_NAME', 'api-scolarite'),
        ],
    ],

    // Table de suivi des migrations dediee pour eviter tout conflit sur la base unique partagee
    'migrations' => env('DB_SCHEMA', 'scolarite') . '_migrations',

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),
        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => 'scolarite:',
        ],
        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '3'),
        ],
    ],
];
