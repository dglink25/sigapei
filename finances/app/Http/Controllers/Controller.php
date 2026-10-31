<?php

namespace App\Http\Controllers;

use App\Common\Responses\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function ok(mixed $data, string $message = 'Opération réussie.', int $statut = 200): JsonResponse
    {
        return ApiResponse::succes($data, $message, $statut);
    }

    protected function page(LengthAwarePaginator $p, callable $presenter): JsonResponse
    {
        return ApiResponse::succes([
            'elements' => array_map($presenter, $p->items()),
            'pagination' => ['page' => $p->currentPage(), 'par_page' => $p->perPage(), 'total' => $p->total(), 'pages' => max(1, $p->lastPage())],
        ]);
    }

    protected function parPage(Request $request): int
    {
        return max(1, min(100, (int) $request->query('par_page', 20)));
    }
}
