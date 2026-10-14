<?php

namespace App\Domain\Etablissement;

use Illuminate\Support\Facades\Cache;

/**
 * Informations publiques d'un etablissement, retrouvees par son code (XXXX).
 * Aucune authentification : ne contient que ce qui est deja public sur la page
 * d'accueil. Jamais le matricule (identifiant de connexion du dirigeant), ni
 * les coordonnees GPS, ni les identifiants internes.
 *
 * Un etablissement suspendu ou archive retourne un contenu degrade.
 */
class InfoEtablissementService
{
    public static function cleCache(string $code): string
    {
        return "etablissement:code:{$code}";
    }

    public function parCode(string $code): ?array
    {
        $code = CodeEtablissementService::normaliser($code);

        if (! CodeEtablissementService::estValide($code)) {
            return null;
        }

        return Cache::remember(self::cleCache($code), (int) env('CACHE_TTL_ACCUEIL', 120), function () use ($code) {
            $etablissement = Etablissement::with(['pays', 'departement', 'commune', 'arrondissement'])
                ->where('code', $code)
                ->first();

            if (! $etablissement) {
                return null;
            }

            if ($etablissement->statut !== 'actif') {
                return [
                    'code' => $etablissement->code,
                    'slug' => $etablissement->slug,
                    'statut' => $etablissement->statut,
                    'degrade' => true,
                    'message' => "Cet établissement n'est pas accessible pour le moment.",
                ];
            }

            return [
                'code' => $etablissement->code,
                'slug' => $etablissement->slug,
                'nom' => $etablissement->nom,
                'types' => $etablissement->types,
                'anneeOuverture' => $etablissement->annee_ouverture,
                'logoDocumentId' => $etablissement->logo_document_id,
                'adresseComplete' => $etablissement->adresse_complete,
                'localisation' => [
                    'pays' => $etablissement->pays ? [
                        'code' => $etablissement->pays->code_iso,
                        'nom' => $etablissement->pays->nom,
                    ] : null,
                    'departement' => $etablissement->departement?->nom,
                    'commune' => $etablissement->commune?->nom,
                    'arrondissement' => $etablissement->arrondissement?->nom,
                ],
                'contact' => [
                    'email' => $etablissement->email,
                    'telephone1' => $etablissement->telephone_1,
                    'telephone2' => $etablissement->telephone_2,
                ],
                'statut' => $etablissement->statut,
                'degrade' => false,
            ];
        });
    }
}
