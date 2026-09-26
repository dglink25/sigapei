<?php

namespace App\Domain\Geo;

use Illuminate\Support\Facades\Cache;

/**
 * Expose le referentiel geographique panafricain pour les selects en
 * cascade de l'etape 2 (section 5.2). Cache Redis a duree de vie longue
 * (le referentiel change tres rarement) pour un affichage instantane.
 */
class GeoService
{
    private function ttl(): int
    {
        return (int) env('CACHE_TTL_GEO', 86400);
    }

    public function listerPays()
    {
        return Cache::remember('geo:pays', $this->ttl(), function () {
            return Pays::orderBy('nom')->get(['uuid', 'code_iso', 'nom', 'indicatif_tel']);
        });
    }

    public function listerDepartements(string $paysUuid)
    {
        return Cache::remember("geo:departements:{$paysUuid}", $this->ttl(), function () use ($paysUuid) {
            $pays = Pays::where('uuid', $paysUuid)->firstOrFail();

            return $pays->departements()->orderBy('nom')->get(['uuid', 'nom']);
        });
    }

    public function listerCommunes(string $departementUuid)
    {
        return Cache::remember("geo:communes:{$departementUuid}", $this->ttl(), function () use ($departementUuid) {
            $departement = Departement::where('uuid', $departementUuid)->firstOrFail();

            return $departement->communes()->orderBy('nom')->get(['uuid', 'nom']);
        });
    }

    public function listerArrondissements(string $communeUuid)
    {
        return Cache::remember("geo:arrondissements:{$communeUuid}", $this->ttl(), function () use ($communeUuid) {
            $commune = Commune::where('uuid', $communeUuid)->firstOrFail();

            return $commune->arrondissements()->orderBy('nom')->get(['uuid', 'nom']);
        });
    }
}
