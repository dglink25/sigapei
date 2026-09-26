<?php

// Les evenements inter-microservices transitent par RabbitMQ (voir
// App\Services\RabbitMQService), pas par le systeme de queue Laravel :
// cette config minimale (driver sync) evite juste une erreur si un composant
// du framework s'y refere.
return [
    'default' => 'sync',
    'connections' => [
        'sync' => ['driver' => 'sync'],
    ],
];
