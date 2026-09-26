<?php

namespace App\Domain\PageAccueil;

use App\Domain\Etablissement\Etablissement;
use Illuminate\Support\Facades\Cache;

/**
 * Page d'accueil publique d'un etablissement (section 3), servie via son
 * slug. Un etablissement suspendu ou archive n'affiche jamais son contenu
 * normal (section 10) : un contenu degrade est retourne a la place.
 */
class AccueilEtablissementService
{
    public function contenu(string $slug): ?array
    {
        return Cache::remember("accueil:etablissement:{$slug}", (int) env('CACHE_TTL_ACCUEIL', 120), function () use ($slug) {
            $etablissement = Etablissement::where('slug', $slug)->first();

            if (! $etablissement) {
                return null;
            }

            if ($etablissement->statut !== 'actif') {
                return [
                    'slug' => $etablissement->slug,
                    'statut' => $etablissement->statut,
                    'degrade' => true,
                    'message' => "Cet etablissement n'est pas accessible pour le moment.",
                ];
            }

            return [
                'slug' => $etablissement->slug,
                'nom' => $etablissement->nom,
                'types' => $etablissement->types,
                'logoDocumentId' => $etablissement->logo_document_id,
                'adresseComplete' => $etablissement->adresse_complete,
                'email' => $etablissement->email,
                'telephone1' => $etablissement->telephone_1,
                'statut' => $etablissement->statut,
                'degrade' => false,
            ];
        });
    }
}
