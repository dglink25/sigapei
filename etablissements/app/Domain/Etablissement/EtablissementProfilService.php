<?php

namespace App\Domain\Etablissement;

use App\Domain\Geo\LocalisationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Modification du profil par l'administrateur de l'etablissement.
 *
 * Modifiables : types, adresse_complete, localisation (hierarchie complete),
 * geolocalisation, logo. Tout le reste (nom, slug, code, matricule, statut,
 * email, telephones, annee d'ouverture, dirigeant...) est refuse avec un 422
 * qui liste les champs refuses. La modification est partielle : seules les cles
 * envoyees sont traitees.
 */
class EtablissementProfilService {
    public const CHAMPS_MODIFIABLES = ['types', 'adresse_complete', 'localisation', 'geolocalisation'];

    private const CLES_LOCALISATION = ['pays_uuid', 'departement_uuid', 'commune_uuid', 'arrondissement_uuid'];

    private const CLES_GPS = ['latitude', 'longitude'];

    public function __construct(
        private LocalisationService $localisation,
        private CyclesAutorisesService $cycles,
        private EtablissementCacheService $cache,
        private LogoService $logos,
    ) {}

    public function exigerActif(Etablissement $etablissement): void    {
        if ($etablissement->statut !== 'actif') {
            abort(409, "Cet établissement n'est pas actif : son profil ne peut pas être modifié.");
        }
    }

    /** 422 listant chaque champ non modifiable ; 422 aussi si le corps est vide. */
    public function exigerChampsAutorises(array $donnees): void    {
        $erreurs = [];

        foreach (array_diff(array_keys($donnees), self::CHAMPS_MODIFIABLES) as $cle) {
            $erreurs[(string) $cle] = ["Le champ « {$cle} » n'est pas modifiable."];
        }

        foreach (['localisation' => self::CLES_LOCALISATION, 'geolocalisation' => self::CLES_GPS] as $section => $autorises) {
            if (isset($donnees[$section]) && is_array($donnees[$section])) {
                foreach (array_diff(array_keys($donnees[$section]), $autorises) as $cle) {
                    $erreurs["{$section}.{$cle}"] = ["Le champ « {$section}.{$cle} » n'est pas modifiable."];
                }
            }
        }

        if ($erreurs) {
            throw ValidationException::withMessages($erreurs);
        }

        if ($donnees === []) {
            throw ValidationException::withMessages(['corps' => ['Aucune modification fournie.']]);
        }
    }

    public function modifier(Etablissement $etablissement, array $donnees): Etablissement
    {
        $this->exigerActif($etablissement);

        DB::transaction(function () use ($etablissement, $donnees) {
            if (array_key_exists('types', $donnees)) {
                $this->appliquerTypes($etablissement, $donnees['types']);
            }

            if (array_key_exists('adresse_complete', $donnees)) {
                $etablissement->adresse_complete = $donnees['adresse_complete'];
            }

            if (isset($donnees['localisation'])) {
                // La hierarchie envoyee remplace l'ancienne : un niveau absent devient null.
                $ids = $this->localisation->resoudre($donnees['localisation']);
                $etablissement->pays_id = $ids['pays_id'];
                $etablissement->departement_id = $ids['departement_id'];
                $etablissement->commune_id = $ids['commune_id'];
                $etablissement->arrondissement_id = $ids['arrondissement_id'];

                $this->localisation->exigerCompleteDepuisIds(
                    $ids['pays_id'], $ids['departement_id'], $ids['commune_id'], $ids['arrondissement_id'],
                    $etablissement->adresse_complete,
                );
            }

            if (isset($donnees['geolocalisation'])) {
                $etablissement->latitude = $donnees['geolocalisation']['latitude'];
                $etablissement->longitude = $donnees['geolocalisation']['longitude'];
            }

            $etablissement->save();
        });

        $this->cache->invalider($etablissement);

        return $this->recharger($etablissement);
    }

    public function remplacerLogo(Etablissement $etablissement, UploadedFile $fichier): string
    {
        $this->exigerActif($etablissement);

        $demande = $etablissement->demande;

        if (! $demande) {
            abort(409, "Aucune demande d'origine n'est rattachée à cet établissement.");
        }

        $document = $this->logos->remplacer($demande, $fichier);

        $etablissement->logo_document_id = $document->uuid;
        $etablissement->save();

        $this->cache->invalider($etablissement);

        return $document->uuid;
    }

    /** Ajoute/retire des types et aligne les cycles : un type retire desactive ses cycles, sans suppression. */
    private function appliquerTypes(Etablissement $etablissement, array $types): void
    {
        $types = array_values(array_unique($types));
        $etablissement->types = $types;

        $voulus = $this->cycles->deriverDepuisTypes($types);

        foreach ($voulus as $cycle) {
            $etablissement->cyclesAutorises()->updateOrCreate(['cycle' => $cycle], ['statut' => 'actif']);
        }

        $etablissement->cyclesAutorises()->whereNotIn('cycle', $voulus)->update(['statut' => 'inactif']);
    }

    private function recharger(Etablissement $etablissement): Etablissement
    {
        return $etablissement->fresh(['pays', 'departement', 'commune', 'arrondissement', 'cyclesAutorises']);
    }

    /** Vue du profil pour l'administrateur (matricule inclus, aucun id interne). */
    public function representer(Etablissement $etablissement): array
    {
        $etablissement->loadMissing(['pays', 'departement', 'commune', 'arrondissement', 'cyclesAutorises']);

        $geo = fn ($el) => $el ? ['uuid' => $el->uuid, 'nom' => $el->nom] : null;

        return [
            'uuid' => $etablissement->uuid,
            'code' => $etablissement->code,
            'slug' => $etablissement->slug,
            'matricule' => $etablissement->matricule,
            'nom' => $etablissement->nom,
            'types' => $etablissement->types,
            'anneeOuverture' => $etablissement->annee_ouverture,
            'logoDocumentId' => $etablissement->logo_document_id,
            'adresseComplete' => $etablissement->adresse_complete,
            'localisation' => [
                'pays' => $etablissement->pays ? ['uuid' => $etablissement->pays->uuid, 'code' => $etablissement->pays->code_iso, 'nom' => $etablissement->pays->nom] : null,
                'departement' => $geo($etablissement->departement),
                'commune' => $geo($etablissement->commune),
                'arrondissement' => $geo($etablissement->arrondissement),
            ],
            'geolocalisation' => [
                'latitude' => $etablissement->latitude !== null ? (float) $etablissement->latitude : null,
                'longitude' => $etablissement->longitude !== null ? (float) $etablissement->longitude : null,
            ],
            'contact' => [
                'email' => $etablissement->email,
                'telephone1' => $etablissement->telephone_1,
                'telephone2' => $etablissement->telephone_2,
            ],
            'cyclesAutorises' => $etablissement->cyclesAutorises->map(fn ($c) => ['cycle' => $c->cycle, 'statut' => $c->statut])->values(),
            'statut' => $etablissement->statut,
            'dateValidation' => $etablissement->date_validation,
            'champsModifiables' => [...self::CHAMPS_MODIFIABLES, 'logo'],
        ];
    }
}
