<?php

namespace App\Http\Controllers;

use App\Docs\OpenApiSpec;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Documentation interactive de l'API (équivalent de /docs sur api-identite) :
 *  - GET /docs      : interface Swagger UI
 *  - GET /docs-json : spécification OpenAPI 3.0 brute (importable dans Postman/Insomnia)
 *
 * Swagger UI est chargé depuis le CDN jsDelivr (version figée) : le navigateur
 * qui ouvre /docs a donc besoin d'un accès internet, pas le serveur.
 */
class DocsController extends Controller
{
    private const VERSION_SWAGGER_UI = '5.17.14';

    public function interfaceSwagger(): Response
    {
        $version = self::VERSION_SWAGGER_UI;

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>API Établissements - Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@{$version}/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@{$version}/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function () {
            window.ui = SwaggerUIBundle({
                url: '/docs-json',
                dom_id: '#swagger-ui',
                persistAuthorization: true,
                docExpansion: 'list',
                tagsSorter: 'alpha',
                deepLinking: true
            });
        };
    </script>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function specification(): JsonResponse
    {
        return response()->json(
            OpenApiSpec::build(),
            200,
            [],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        );
    }
}
