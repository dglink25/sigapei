<?php

// Microservice API pur (JWT/secret interne) : pas de session cote serveur.
// Config minimale requise par le framework.
return [
    'driver' => 'array',
    'lifetime' => 120,
    'expire_on_close' => true,
    'encrypt' => false,
    'files' => storage_path('framework/sessions'),
    'cookie' => 'sigapei_etablissements_session',
    'path' => '/',
    'domain' => null,
    'secure' => true,
    'http_only' => true,
    'same_site' => 'lax',
];
