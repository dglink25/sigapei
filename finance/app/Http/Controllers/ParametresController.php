<?php

namespace App\Http\Controllers;

use App\Services\Gouvernance;
use App\Services\Parametres;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Paramètres financiers et grille rôle x action (administrateur de l'établissement). */
class ParametresController extends Controller
{
    public function __construct(
        private readonly Parametres $parametres,
        private readonly Gouvernance $gouvernance,
    ) {}

    public function lire(): JsonResponse
    {
        $this->gouvernance->exigerAdministrateur();

        return $this->ok($this->parametres->lire());
    }

    public function enregistrer(Request $request): JsonResponse
    {
        $this->gouvernance->exigerAdministrateur();
        $d = $request->validate([
            'devise' => ['sometimes', Rule::in(['XOF', 'XAF', 'GNF'])],
            'double_validation_reglements' => ['sometimes', 'boolean'],
            'relance_jours_avant' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'relance_jours_apres' => ['sometimes', 'array', 'max:6'],
            'relance_jours_apres.*' => ['integer', 'min:1', 'max:120', 'distinct'],
            'mentions_recu' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        return $this->ok($this->parametres->enregistrer($d), 'Paramètres enregistrés.');
    }

    public function grille(): JsonResponse
    {
        $this->gouvernance->exigerAdministrateur();

        return $this->ok($this->gouvernance->grille());
    }

    public function definirRole(Request $request, string $role): JsonResponse
    {
        $d = $request->validate([
            'actions' => ['present', 'array', 'max:'.count(Gouvernance::ACTIONS)],
            'actions.*' => ['string', 'distinct', Rule::in(array_keys(Gouvernance::ACTIONS))],
        ]);

        return $this->ok($this->gouvernance->definir($role, $d['actions']), 'Droits du rôle enregistrés.');
    }
}
