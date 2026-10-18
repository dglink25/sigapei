<?php

namespace App\Http\Controllers;

use App\Domain\Etablissement\EtablissementProfilService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Profil de l'etablissement de l'administrateur connecte (contexte fourni par ContexteTenant). */
class MonEtablissementController extends Controller {
    public function __construct(private EtablissementProfilService $profil) {}

    public function afficher(Request $request): JsonResponse    {
        return response()->json([
            'success' => true,
            'etablissement' => $this->profil->representer($request->attributes->get('etablissement')),
        ]);
    }

    public function modifier(Request $request): JsonResponse    {
        $etablissement = $request->attributes->get('etablissement');

        $this->profil->exigerActif($etablissement);
        $this->profil->exigerChampsAutorises($request->all());

        $donnees = $request->validate([
            'types' => ['sometimes', 'array', 'min:1', 'max:3'],
            'types.*' => ['string', 'distinct', Rule::in(['primaire', 'secondaire', 'universite'])],
            'adresse_complete' => ['sometimes', 'string', 'min:5', 'max:1000'],
            'localisation' => ['sometimes', 'array'],
            'localisation.pays_uuid' => ['required_with:localisation', 'uuid'],
            'localisation.departement_uuid' => ['nullable', 'uuid'],
            'localisation.commune_uuid' => ['nullable', 'uuid'],
            'localisation.arrondissement_uuid' => ['nullable', 'uuid'],
            'geolocalisation' => ['sometimes', 'array'],
            'geolocalisation.latitude' => ['required_with:geolocalisation', 'numeric', 'between:-90,90'],
            'geolocalisation.longitude' => ['required_with:geolocalisation', 'numeric', 'between:-180,180'],
        ]);

        $etablissement = $this->profil->modifier($etablissement, $donnees);

        return response()->json([
            'success' => true,
            'etablissement' => $this->profil->representer($etablissement),
        ]);
    }

    public function remplacerLogo(Request $request): JsonResponse
    {
        $etablissement = $request->attributes->get('etablissement');

        $this->profil->exigerActif($etablissement);

        $donnees = $request->validate([
            'fichier' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048'],
        ]);

        $documentUuid = $this->profil->remplacerLogo($etablissement, $donnees['fichier']);

        return response()->json(['success' => true, 'logoDocumentId' => $documentUuid]);
    }
}
