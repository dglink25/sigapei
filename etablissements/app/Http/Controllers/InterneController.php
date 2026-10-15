<?php

namespace App\Http\Controllers;

use App\Domain\Validation\ValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class InterneController extends Controller
{
    public function __construct(private ValidationService $validationService) {}

    public function listerDemandes(): JsonResponse
    {
        return response()->json(['success' => true, 'demandes' => $this->validationService->listerDemandesAInstruire()]);
    }

    public function afficherDemande(string $uuid): JsonResponse
    {
        $demande = \App\Domain\Onboarding\DemandeEtablissement::where('uuid', $uuid)
            ->with('documents')
            ->firstOrFail();

        $s3Configure = !empty(env('AWS_ACCESS_KEY_ID')) && !empty(env('AWS_SECRET_ACCESS_KEY')) && !empty(env('AWS_BUCKET'));

        $documents = $demande->documents->map(function ($doc) use ($s3Configure) {
            $url = null;

            if ($s3Configure) {
                try {
                    $disk = \Illuminate\Support\Facades\Storage::disk('s3');
                    $url  = method_exists($disk, 'temporaryUrl')
                        ? $disk->temporaryUrl($doc->chemin_stockage, now()->addMinutes(60))
                        : $disk->url($doc->chemin_stockage);
                } catch (\Throwable) {
                    $url = null;
                }
            }

            return [
                'uuid'   => $doc->uuid,
                'type'   => $doc->type,
                'nom'    => basename($doc->chemin_stockage),
                'mime'   => $doc->mime_type,
                'taille' => $doc->taille_octets,
                'url'    => $url,
                'chemin' => $doc->chemin_stockage, // utile pour debug en dev
            ];
        });

        return response()->json([
            'success' => true,
            'demande' => array_merge($demande->toArray(), ['documents' => $documents->values()]),
        ]);
    }

    public function marquerCorrections(Request $request, string $uuid): JsonResponse
    {
        // Chaque section a corriger doit etre accompagnee d'un motif (section 7.2).
        $donnees = $request->validate([
            'champsACorriger' => ['required', 'array', 'min:1'],
            'champsACorriger.*' => ['required', 'string', 'min:3'],
        ]);

        $demande = $this->validationService->demanderCorrection($uuid, $donnees['champsACorriger']);

        return response()->json(['success' => true, 'demandeUuid' => $demande->uuid, 'statut' => $demande->statut]);
    }

    public function valider(string $uuid): JsonResponse
    {
        $etablissement = $this->validationService->valider($uuid);

        return response()->json([
            'success' => true,
            'etablissementUuid' => $etablissement->uuid,
            'code' => $etablissement->code,
            'slug' => $etablissement->slug,
            'matricule' => $etablissement->matricule,
        ]);
    }

    public function renvoyerLienCorrection(string $uuid): JsonResponse
    {
        $demande = \App\Domain\Onboarding\DemandeEtablissement::where('uuid', $uuid)->firstOrFail();

        if ($demande->statut !== 'correction_demandee') {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'STATUT_INVALIDE', 'message' => 'Ce dossier n\'est pas en attente de correction.'],
            ], 409);
        }

        // Regénérer un nouveau token et renvoyer les notifications
        $tokenClair = $this->validationService->renvoyerLienCorrection($uuid);

        return response()->json([
            'success' => true,
            'lienCorrection' => $tokenClair,
        ]);
    }

    public function supprimerBrouillon(string $uuid): JsonResponse
    {
        $demande = \App\Domain\Onboarding\DemandeEtablissement::where('uuid', $uuid)->first();
        if (!$demande) return response()->json(['success' => true]);
        if ($demande->statut !== 'brouillon') {
            return response()->json(['success' => false, 'error' => ['code' => 'NON_SUPPRIMABLE', 'message' => 'Seul un brouillon peut être supprimé.']], 409);
        }
        $demande->documents()->delete();
        $demande->delete();
        return response()->json(['success' => true]);
    }

    public function supprimerBrouillons(Request $request): JsonResponse
    {
        $donnees = $request->validate(['uuids' => ['required', 'array', 'min:1'], 'uuids.*' => ['required', 'uuid']]);
        $supprimes = 0;
        foreach ($donnees['uuids'] as $uuid) {
            $demande = \App\Domain\Onboarding\DemandeEtablissement::where('uuid', $uuid)
                ->where('statut', 'brouillon')->first();
            if ($demande) { $demande->documents()->delete(); $demande->delete(); $supprimes++; }
        }
        return response()->json(['success' => true, 'supprimes' => $supprimes]);
    }

    public function suspendre(string $uuid): JsonResponse
    {
        $etablissement = $this->validationService->suspendre($uuid);

        return response()->json(['success' => true, 'etablissementUuid' => $etablissement->uuid, 'statut' => $etablissement->statut]);
    }

    public function reactiver(string $uuid): JsonResponse
    {
        $etablissement = $this->validationService->reactiver($uuid);

        return response()->json(['success' => true, 'etablissementUuid' => $etablissement->uuid, 'statut' => $etablissement->statut]);
    }

    /** Consomme par la passerelle API a chaque requete entrante contenant un slug (section 2.1). */
    public function resolutionSlug(string $slug): JsonResponse
    {
        $resolution = $this->validationService->resoudreSlug($slug);

        if (! $resolution) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'SLUG_INTROUVABLE', 'message' => 'Aucun établissement ne correspond à ce slug.'],
            ], 404);
        }

        return response()->json(['success' => true, ...$resolution]);
    }
}
