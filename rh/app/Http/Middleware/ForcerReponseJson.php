<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Force toutes les reponses de cette API a etre traitees/serialisees en JSON. */
class ForcerReponseJson
{
    public function handle(Request $request, Closure $next)
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
