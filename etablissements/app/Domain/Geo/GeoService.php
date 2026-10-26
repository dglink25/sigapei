<?php

namespace App\Domain\Geo;

use Illuminate\Support\Facades\Cache;

/**
 * Referentiel geographique mondial pour les selects en cascade de l'etape 2 :
 * pays -> departements (regions, etats, provinces...) -> communes (villes) ->
 * arrondissements (quartiers...).
 *
 * Cache Redis longue duree (le referentiel change tres rarement). Toutes les
 * cles incluent un numero de version (geo:version) : un import ou un seeder
 * l'incremente, ce qui invalide d'un coup tout le cache geographique sans avoir
 * a lister les cles une a une.
 *
 * Les listes completes sont mises en cache ; une recherche (parametre q) ne
 * l'est pas : elle est bornee par une limite (50 par defaut, 200 au maximum) et
 * sert aux niveaux tres peuplés (des milliers de communes dans certains pays).
 */
class GeoService
{
    private const LIMITE_DEFAUT = 50;

    private const LIMITE_MAX = 200;

    private function ttl(): int
    {
        return (int) env('CACHE_TTL_GEO', 86400);
    }

    private function version(): int
    {
        return (int) Cache::get('geo:version', 0);
    }

    private function cle(string $suffixe): string
    {
        return 'geo:v'.$this->version().':'.$suffixe;
    }

    public function listerPays(?string $continent = null)
    {
        $continent = $continent ? strtolower(trim($continent)) : null;

        return Cache::remember($this->cle('pays:'.($continent ?? 'tous')), $this->ttl(), function () use ($continent) {
            return Pays::query()
                ->when($continent, fn ($requete) => $requete->where('continent', $continent))
                ->orderBy('nom')
                ->get([
                    'uuid', 'code_iso', 'code_iso3', 'nom', 'indicatif_tel', 'continent',
                    'libelle_niveau_1', 'libelle_niveau_2', 'libelle_niveau_3',
                ]);
        });
    }

    public function listerDepartements(string $paysUuid, ?string $recherche = null, ?int $limite = null)
    {
        if ($this->rechercheDemandee($recherche)) {
            $pays = Pays::where('uuid', $paysUuid)->firstOrFail();

            return $this->rechercher($pays->departements(), $recherche, $limite);
        }

        return Cache::remember($this->cle("departements:{$paysUuid}"), $this->ttl(), function () use ($paysUuid) {
            $pays = Pays::where('uuid', $paysUuid)->firstOrFail();

            return $pays->departements()->orderBy('nom')->get(['uuid', 'nom']);
        });
    }

    public function listerCommunes(string $departementUuid, ?string $recherche = null, ?int $limite = null)
    {
        if ($this->rechercheDemandee($recherche)) {
            $departement = Departement::where('uuid', $departementUuid)->firstOrFail();

            return $this->rechercher($departement->communes(), $recherche, $limite);
        }

        return Cache::remember($this->cle("communes:{$departementUuid}"), $this->ttl(), function () use ($departementUuid) {
            $departement = Departement::where('uuid', $departementUuid)->firstOrFail();

            return $departement->communes()->orderBy('nom')->get(['uuid', 'nom']);
        });
    }

    public function listerArrondissements(string $communeUuid, ?string $recherche = null, ?int $limite = null)
    {
        if ($this->rechercheDemandee($recherche)) {
            $commune = Commune::where('uuid', $communeUuid)->firstOrFail();

            return $this->rechercher($commune->arrondissements(), $recherche, $limite);
        }

        return Cache::remember($this->cle("arrondissements:{$communeUuid}"), $this->ttl(), function () use ($communeUuid) {
            $commune = Commune::where('uuid', $communeUuid)->firstOrFail();

            return $commune->arrondissements()->orderBy('nom')->get(['uuid', 'nom']);
        });
    }

    private function rechercheDemandee(?string $recherche): bool
    {
        return $recherche !== null && trim($recherche) !== '';
    }

    private function rechercher($relation, string $recherche, ?int $limite)
    {
        $motif = '%'.addcslashes(mb_substr(trim($recherche), 0, 100), '%_\\').'%';
        $limite = min(max($limite ?? self::LIMITE_DEFAUT, 1), self::LIMITE_MAX);

        return $relation
            ->where('nom', 'ILIKE', $motif)
            ->orderBy('nom')
            ->limit($limite)
            ->get(['uuid', 'nom']);
    }
}
