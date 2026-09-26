<?php

// Ce microservice n'authentifie pas d'utilisateurs final lui-meme (c'est le
// role d'api-identite) : config minimale requise par le framework.
return [
    'defaults' => ['guard' => 'api', 'passwords' => 'users'],
    'guards' => [
        'api' => ['driver' => 'token', 'provider' => 'users'],
    ],
    'providers' => [
        'users' => ['driver' => 'array'],
    ],
    'passwords' => [],
    'password_timeout' => 10800,
];
