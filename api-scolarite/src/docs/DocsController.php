<?php

namespace App\docs;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class DocsController extends Controller
{
    public function catalogue(): JsonResponse
    {
        return response()->json(DocsData::catalogue());
    }
}
