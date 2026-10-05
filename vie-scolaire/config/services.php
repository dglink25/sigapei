<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Configuration commune a tous les microservices
    |--------------------------------------------------------------------------
    |
    | Regle n°1 : chaque microservice est proprietaire exclusif de son
    | schema PostgreSQL et ne lit les donnees d'un autre microservice
    | que via son API interne (/interne/... + X-Internal-Secret) ou via
    | un evenement RabbitMQ. Aucune jointure SQL inter-schemas.
    |
    | Regle n°3 : INTERNAL_API_SECRET est un secret partage a
    | l'identique sur toute la plateforme, fourni par le chef de
    | projet. On n'en genere jamais un local.
    |
    */

    'microservices' => [

        // URL de base des API internes des autres microservices.
        'urls' => [
            'identite' => env('IDENTITE_URL', 'http://identite:4001'),
            'scolarite' => env('SCOLARITE_URL', 'http://scolarite:4000'),
            'rh' => env('RH_URL', 'http://rh:4000'),
        ],

        // Delai d'attente des appels inter-microservices (secondes).
        'timeout' => (int) env('MICROSERVICES_TIMEOUT', 5),
    ],

    /*
    |--------------------------------------------------------------------------
    | Secret interne partage (Regle n°3)
    |--------------------------------------------------------------------------
    |
    | Entete attendu : X-Internal-Secret
    |
    */

    'interne' => [
        'secret' => env('INTERNAL_API_SECRET'),
        'header' => 'X-Internal-Secret',
    ],

    /*
    |--------------------------------------------------------------------------
    | CAPTCHA partage (Regle n°4)
    |--------------------------------------------------------------------------
    |
    | Un seul compte reCAPTCHA / hCaptcha pour toute la plateforme :
    | memes valeurs que celles deja utilisees par identite.
    | Seule la cle SECRETE vit ici ; la cle publique est cote front.
    |
    */

    'captcha' => [
        'provider' => env('CAPTCHA_PROVIDER', 'recaptcha'),
        'secret' => env('CAPTCHA_SECRET_KEY'),
        'min_score' => (float) env('CAPTCHA_MIN_SCORE', 0.5),
        'timeout' => (int) env('CAPTCHA_TIMEOUT', 5),

        'endpoints' => [
            'recaptcha' => 'https://www.google.com/recaptcha/api/siteverify',
            'hcaptcha' => 'https://api.hcaptcha.com/siteverify',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
