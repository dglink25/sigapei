<?php

namespace App\Common\Middlewares;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Regle n°3 - protection des endpoints /interne/* par le secret partage.
 *
 * Les endpoints `/interne/*` ne sont appeles QUE par la passerelle API
 * ou par un autre microservice, jamais par un client final. Ils sont
 * proteges par INTERNAL_API_SECRET, un secret unique a l'identique sur
 * toute la plateforme, transmis dans l'entete `X-Internal-Secret`.
 *
 * La valeur ne doit jamais etre generee localement : une valeur
 * differente empecherait les autres microservices d'appeler ce service,
 * et ce service d'appeler les autres.
 *
 * La comparaison est en temps constant pour ne pas fuir le secret par
 * mesure du temps de reponse.
 */
class VerifySecretInternal
{
    public function handle(Request $request, Closure $next): Response
    {
        $secretAttendu = (string) config('services.interne.secret', '');
        $header = (string) config('services.interne.header', 'X-Internal-Secret');

        if ($secretAttendu === '') {
            return $this->refuser(
                'Configuration INTERNAL_API_SECRET absente : endpoint interne indisponible.'
            );
        }

        $secretRecu = (string) $request->header($header, '');

        if ($secretRecu === '' || ! hash_equals($secretAttendu, $secretRecu)) {
            return $this->refuser('Secret interne invalide.');
        }

        return $next($request);
    }

    private function refuser(string $message): Response
    {
        return response()->json(['message' => $message], 403);
    }
}
