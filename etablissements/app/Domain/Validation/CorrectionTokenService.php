<?php

namespace App\Domain\Validation;

use App\Domain\Onboarding\DemandeEtablissement;
use Illuminate\Support\Str;

/**
 * Jetons de lien de correction a usage unique (section 7.2) : le dirigeant
 * accede au formulaire de correction sans authentification, le jeton faisant
 * office de preuve de possession du canal de notification (WhatsApp/e-mail).
 * Duree de vie 72h, regenere a chaque relance (section 7.3).
 */
class CorrectionTokenService
{
    public function genererPour(DemandeEtablissement $demande): string
    {
        $token = Str::random(48);
        $ttlHeures = (int) env('CORRECTION_TOKEN_TTL_HEURES', 72);

        $demande->lien_correction_token = hash('sha256', $token);
        $demande->lien_correction_expire_le = now()->addHours($ttlHeures);
        $demande->save();

        // Le jeton en clair n'est jamais stocke : seul son hash l'est.
        // Il n'est renvoye qu'une fois, pour etre inclus dans le lien envoye
        // par WhatsApp/e-mail (via l'evenement consomme par Communication).
        return $token;
    }

    public function urlCorrection(string $tokenEnClair): string
    {
        return rtrim(env('FRONT_URL_CORRECTION', ''), '/').'/'.$tokenEnClair;
    }

    public function resoudre(string $tokenEnClair): ?DemandeEtablissement
    {
        $demande = DemandeEtablissement::where('lien_correction_token', hash('sha256', $tokenEnClair))->first();

        if (! $demande) {
            return null;
        }

        if ($demande->lien_correction_expire_le?->isPast()) {
            return null;
        }

        if ($demande->statut !== 'correction_demandee') {
            return null;
        }

        return $demande;
    }

    public function invalider(DemandeEtablissement $demande): void
    {
        $demande->lien_correction_token = null;
        $demande->lien_correction_expire_le = null;
        $demande->save();
    }
}
