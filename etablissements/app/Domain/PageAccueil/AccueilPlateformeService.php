<?php

namespace App\Domain\PageAccueil;

use Illuminate\Support\Facades\Cache;

/** Contenu public de la page d'accueil par defaut de la plateforme SIGAPEI. */
class AccueilPlateformeService
{
    public function contenu(): array
    {
        return Cache::remember('accueil:plateforme', (int) env('CACHE_TTL_ACCUEIL', 120), function () {
            return [
                'plateforme' => 'SIGAPEI',
                'titre' => 'SIGAPEI - Systeme Integre de Gestion Academique des Etablissements et de leurs Inscriptions',
                'accroche' => 'La plateforme integree de gestion scolaire multi-etablissements en Afrique.',
                'appelAAction' => [
                    'texte' => "Inscrire mon etablissement",
                    'url' => '/demandes/nouvelle',
                ],
            ];
        });
    }
}
