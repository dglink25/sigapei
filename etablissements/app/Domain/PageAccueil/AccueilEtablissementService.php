<?php

namespace App\Domain\PageAccueil;

use App\Domain\Etablissement\Etablissement;
use Illuminate\Support\Facades\Cache;

/**
 * Page d'accueil publique d'un établissement (GET /etablissements/{slug}/accueil).
 *
 * Fusionne :
 *   - les informations de base de l'établissement (nom, logo, contacts…)
 *   - la configuration de la page d'accueil (hero, statistiques, à propos,
 *     galerie, actualités, réseaux sociaux) stockée dans etablissement_page_accueil
 *
 * Les "formations" ne sont PAS incluses ici : elles correspondent aux classes
 * configurées dans Scolarité et sont accessibles via le module Configuration académique.
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
                    'code'    => $etablissement->code,
                    'slug'    => $etablissement->slug,
                    'statut'  => $etablissement->statut,
                    'degrade' => true,
                    'message' => "Cet établissement n'est pas accessible pour le moment.",
                ];
            }

            // Données de base
            $base = [
                'code'            => $etablissement->code,
                'slug'            => $etablissement->slug,
                'nom'             => $etablissement->nom,
                'types'           => $etablissement->types,
                'logoDocumentId'  => $etablissement->logo_document_id,
                'adresseComplete' => $etablissement->adresse_complete,
                'email'           => $etablissement->email,
                'telephone1'      => $etablissement->telephone_1,
                'statut'          => $etablissement->statut,
                'degrade'         => false,
            ];

            // Configuration de la page d'accueil (peut être null si non configurée)
            $page = EtablissementPageAccueil::where('etablissement_id', $etablissement->id)->first();

            $apropos = $page?->apropos ?? [];

            return array_merge($base, [
                'devise'         => $apropos['devise']    ?? null,
                'hero'           => $page?->hero          ?? [],
                'statistiques'   => $page?->statistiques  ?? [],
                'apropos'        => [
                    'texte'   => $apropos['texte']   ?? '',
                    'mission' => $apropos['mission'] ?? '',
                    'vision'  => $apropos['vision']  ?? '',
                ],
                'galerie'        => $page?->galerie       ?? [],
                'actualites'     => $page?->actualites    ?? [],
                'reseauxSociaux' => $page?->reseaux_sociaux ?? [],
            ]);
        });
    }
}
