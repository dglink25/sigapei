<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/**
 * Documentation interactive de l'API (même convention qu'api-identite et api-etablissements) :
 *  - GET /docs      : interface Swagger UI (tester chaque route, voir requêtes et réponses)
 *  - GET /docs-json : spécification OpenAPI 3.0 brute (importable dans Postman/Insomnia)
 *
 * Source unique : docs/openapi.json. Swagger UI est chargé depuis jsDelivr (version figée) :
 * c'est le navigateur qui ouvre /docs qui a besoin d'internet, pas le serveur.
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
    <title>API Évaluations - Documentation</title>
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

    public function specification(): Response
    {
        return response((string) file_get_contents(base_path('docs/openapi.json')), 200)
            ->header('Content-Type', 'application/json; charset=UTF-8');
    }
}
