<?php

namespace App\Http\Controllers;

use App\Common\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

abstract class Controller
{
    protected function ok(mixed $donnees, string $message = 'Opération réussie.', int $statut = 200): JsonResponse
    {
        return ApiResponse::succes($donnees, $message, $statut);
    }

    protected function page(LengthAwarePaginator $p): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Opération réussie.',
            'data' => $p->items(),
            'meta' => [
                'page' => $p->currentPage(),
                'par_page' => $p->perPage(),
                'total' => $p->total(),
                'pages' => $p->lastPage(),
            ],
        ]);
    }

    protected function parPage(Request $request): int
    {
        return min(max((int) $request->query('par_page', 25), 1), 100);
    }
}
