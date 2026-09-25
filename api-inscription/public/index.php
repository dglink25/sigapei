<?php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Sonde de sante directe
if ($uri === '/sante' || $uri === '/sante/') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'statut' => 'ok',
        'service' => 'api-inscription',
        'horodatage' => date('c'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Route interactive /docs directe
if ($uri === '/docs' || $uri === '/docs/') {
    header('Content-Type: application/json; charset=utf-8');
    require_once __DIR__ . '/../src/docs/DocsData.php';
    echo json_encode(\App\docs\DocsData::catalogue(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Bootstrap Laravel si l'autoloader existe
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    $response = $kernel->handle($request = \Illuminate\Http\Request::capture())->send();
    $kernel->terminate($request, $response);
} else {
    header('Content-Type: application/json; charset=utf-8', true, 200);
    echo json_encode([
        'service' => 'api-inscription',
        'message' => 'Microservice Inscription actif. Documentation sur /docs, sante sur /sante.',
        'documentation_url' => 'http://localhost:4003/docs',
        'sante_url' => 'http://localhost:4003/sante',
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
