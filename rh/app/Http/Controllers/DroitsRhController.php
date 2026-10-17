<?php

namespace App\Http\Controllers;

use App\Common\Droits\DroitsRh;
use App\Common\Tenant\Contexte;
use Illuminate\Http\JsonResponse;

/**
 * Exposition du moteur de rôles RH (CDC RH §5.7 / §12) : fonctions du module RH
 * accessibles à l'utilisateur courant, déduites de ses rôles RH personnalisés.
 */
class DroitsRhController extends Controller
{
    public function __construct(
        private readonly DroitsRh $droits,
    ) {}

    /** GET /v1/rh/mes-fonctions — fonctions RH accordées à l'utilisateur courant. */
    public function mesFonctions(): JsonResponse
    {
        $fonctions = $this->droits->fonctionsPourUtilisateur(Contexte::utilisateurUuid());

        return $this->ok([
            'fonctions' => $fonctions,
        ], 'Fonctions RH de l\'utilisateur courant.');
    }
}
