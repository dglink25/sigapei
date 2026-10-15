<?php

// Router pour le serveur integre PHP CLI (php -S)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (php_sapi_name() === 'cli-server' && $uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Bootstrap complet Laravel si les dependances sont installees
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $response = $kernel->handle($request = \Illuminate\Http\Request::capture());
    $response->send();
    $kernel->terminate($request, $response);
    exit;
}

// Sonde de sante de secours (si vendor/ non encore installe)
if ($uri === '/sante' || $uri === '/sante/') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'statut' => 'ok',
        'service' => 'api-inscription',
        'horodatage' => date('c'),
        'mode' => 'secours-sans-vendor',
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Route interactive /docs de secours
if ($uri === '/docs' || $uri === '/docs/') {
    header('Content-Type: application/json; charset=utf-8');
    require_once __DIR__ . '/../src/docs/DocsData.php';
    echo json_encode(\App\docs\DocsData::catalogue(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Message d'attente si acces sans installation Composer
header('Content-Type: application/json; charset=utf-8', true, 200);
echo json_encode([
    'service' => 'api-inscription',
    'statut' => 'en_attente_initialisation',
    'message' => 'Microservice Inscription initialise. Executez composer install pour activer l\'ensemble des routes metier.',
    'documentation_url' => '/docs',
    'sante_url' => '/sante',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
