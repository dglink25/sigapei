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

    // Webhooks des agrégateurs : secret partagé configuré dans leur tableau de bord.
    'fedapay' => [
        'secret_key' => env('FEDAPAY_SECRET_KEY'),
        'environment' => env('FEDAPAY_ENVIRONMENT', 'sandbox'),
        'webhook_secret' => env('FEDAPAY_WEBHOOK_SECRET'),
        // Fenêtre de validité de l'horodatage signé (anti-rejeu), en secondes.
        'tolerance' => (int) env('FEDAPAY_WEBHOOK_TOLERANCE', 300),
    ],

    'kkiapay' => [
        'public_key' => env('KKIAPAY_PUBLIC_KEY'),
        'private_key' => env('KKIAPAY_PRIVATE_KEY'),
        'secret' => env('KKIAPAY_SECRET'),
        'sandbox' => (bool) env('KKIAPAY_SANDBOX', true),
    ],
];
