<?php

return [
    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DATABASE_URL'),
            'host' => env('DB_HOST', 'postgres'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'sigapei'),
            'username' => env('DB_USERNAME', 'sigapei'),
            'password' => env('DB_PASSWORD', 'change-me'),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => env('DB_SCHEMA', 'scolarite') . ',public',
            'sslmode' => env('DB_SSLMODE', 'prefer'),
        ],
    ],

    'migrations' => 'migrations',
];
