<?php

namespace App\Domain\Etablissement;

use Illuminate\Support\Facades\Cache;

/**
 * Invalide tous les caches publics d'un etablissement. Partage par
 * ValidationService (suspension/reactivation) et EtablissementProfilService
 * (modification par l'administrateur).
 */
class EtablissementCacheService
{
    public function invalider(Etablissement $etablissement): void
    {
        Cache::forget("slug:resolution:{$etablissement->slug}");
        Cache::forget("accueil:etablissement:{$etablissement->slug}");
        Cache::forget(InfoEtablissementService::cleCache($etablissement->code));
    }
}
