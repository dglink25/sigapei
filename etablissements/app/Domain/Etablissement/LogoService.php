<?php

namespace App\Domain\Etablissement;

use App\Domain\Onboarding\DemandeEtablissement;
use App\Domain\Onboarding\DocumentEtablissement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Throwable;

/**
 * Le logo est un DocumentEtablissement (type "logo") rattache a la demande
 * d'origine. Un remplacement stocke le nouveau fichier, remplace la ligne en
 * transaction, puis supprime l'ancien fichier : jamais deux logos pour une demande.
 */
class LogoService
{
    public function remplacer(DemandeEtablissement $demande, UploadedFile $fichier): DocumentEtablissement
    {
        $disk = config('filesystems.default', 'local');
        $stockage = Storage::disk($disk);

        $chemin = $fichier->store("demandes/{$demande->uuid}/logo", $disk);

        if (! $chemin) {
            abort(500, 'Impossible de stocker le document. Vérifiez la configuration du stockage.');
        }

        $anciensChemins = $demande->documents()->where('type', 'logo')->pluck('chemin_stockage')->all();

        try {
            $document = DB::transaction(function () use ($demande, $fichier, $chemin) {
                $demande->documents()->where('type', 'logo')->delete();

                return $demande->documents()->create([
                    'type' => 'logo',
                    'chemin_stockage' => $chemin,
                    'mime_type' => $fichier->getMimeType(),
                    'taille_octets' => $fichier->getSize(),
                ]);
            });
        } catch (Throwable $e) {
            $stockage->delete($chemin);
            throw $e;
        }

        foreach ($anciensChemins as $ancien) {
            try {
                $stockage->delete($ancien);
            } catch (Throwable) {
                // fichier orphelin : sans consequence fonctionnelle
            }
        }

        return $document;
    }
}
