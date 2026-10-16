<?php

/**
 * CDC §14.2 : RabbitMQ est le broker de la file de génération des PDF de bulletins.
 * Nécessite : composer require vladimir-yuldashev/laravel-queue-rabbitmq
 * Les clés host/port/login/password/vhost sont aussi lues par App\Integrations\RabbitMqPublisher.
 * Tests : QUEUE_CONNECTION=sync dans phpunit.xml.
 */
return [
    'default' => env('QUEUE_CONNECTION', 'rabbitmq'),

    'connections' => [
        'sync' => ['driver' => 'sync'],

        'rabbitmq' => [
            'driver' => 'rabbitmq',
            'queue' => env('RABBITMQ_QUEUE_EVALUATIONS', 'evaluations.taches'),
            'host' => env('RABBITMQ_HOST', 'rabbitmq'),
            'port' => (int) env('RABBITMQ_PORT', 5672),
            'login' => env('RABBITMQ_USER'),
            'password' => env('RABBITMQ_PASSWORD'),
            'vhost' => env('RABBITMQ_VHOST', '/'),
            // false en test : aucun événement n'est émis.
            'publication_active' => (bool) env('RABBITMQ_PUBLICATION', true),
            'hosts' => [[
                'host' => env('RABBITMQ_HOST', 'rabbitmq'),
                'port' => (int) env('RABBITMQ_PORT', 5672),
                'user' => env('RABBITMQ_USER'),
                'password' => env('RABBITMQ_PASSWORD'),
                'vhost' => env('RABBITMQ_VHOST', '/'),
            ]],
        ],
    ],

    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'null'),
    ],
];
