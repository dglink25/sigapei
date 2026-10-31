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

        $documents = $demande->documents->map(function ($doc) {
            $url = null;
            $disk = config('filesystems.default', 'local');

            try {
                $storage = \Illuminate\Support\Facades\Storage::disk($disk);

                if ($disk === 's3' && !empty(env('AWS_ACCESS_KEY_ID'))) {
                    // Production S3 : URL pré-signée 60 min
                    $url = method_exists($storage, 'temporaryUrl')
                        ? $storage->temporaryUrl($doc->chemin_stockage, now()->addMinutes(60))
                        : $storage->url($doc->chemin_stockage);
                } else {
                    // Dev local : URL de téléchargement via endpoint public
                    $url = env('APP_URL', 'http://localhost:4002')
                        . '/v1/documents/' . $doc->uuid;
                }
            } catch (\Throwable) {
                $url = null;
            }

            return [
                'uuid'   => $doc->uuid,
                'type'   => $doc->type,
                'nom'    => basename($doc->chemin_stockage),
                'mime'   => $doc->mime_type,
                'taille' => $doc->taille_octets,
                'url'    => $url,
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

    public function listerEtablissements(): JsonResponse
    {
        $etablissements = \App\Domain\Etablissement\Etablissement::orderBy('nom')
            ->with('cyclesAutorises')
            ->get()
            ->map(fn($e) => [
                'uuid'             => $e->uuid,
                'nom'              => $e->nom,
                'code'             => $e->code,
                'slug'             => $e->slug,
                'matricule'        => $e->matricule,
                'types'            => $e->types,
                'statut'           => $e->statut,
                'adresse_complete' => $e->adresse_complete,
                'email'            => $e->email,
                'telephone_1'      => $e->telephone_1,
                'date_validation'  => $e->date_validation,
                'cyclesAutorises'  => $e->cyclesAutorises
                    ->where('statut', 'actif')
                    ->pluck('cycle')
                    ->values(),
            ]);

        return response()->json(['success' => true, 'etablissements' => $etablissements]);
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

    /** Téléchargement sécurisé d'un document (dev local uniquement). */
    public function telechargerDocument(string $uuid)
    {
        $doc = \App\Domain\Onboarding\DocumentEtablissement::where('uuid', $uuid)->firstOrFail();

        $disk = config('filesystems.default', 'local');
        $storage = \Illuminate\Support\Facades\Storage::disk($disk);

        if (! $storage->exists($doc->chemin_stockage)) {
            abort(404, 'Fichier introuvable.');
        }

        return response()->streamDownload(
            fn () => print($storage->get($doc->chemin_stockage)),
            basename($doc->chemin_stockage),
            ['Content-Type' => $doc->mime_type ?? 'application/octet-stream']
        );
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
