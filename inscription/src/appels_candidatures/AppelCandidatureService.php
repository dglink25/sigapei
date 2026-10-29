<?php

namespace App\appels_candidatures;

use Illuminate\Database\Eloquent\Collection;

class AppelCandidatureService
{
    public function lister(array $filtres = []): Collection
    {
        $q = AppelCandidature::query()->orderByDesc('created_at');

        if (!empty($filtres['cycle'])) {
            $q->where('cycle', $filtres['cycle']);
        }
        if (!empty($filtres['statut'])) {
            $q->where('statut', $filtres['statut']);
        }
        if (!empty($filtres['annee_scolaire'])) {
            $q->where('annee_scolaire', $filtres['annee_scolaire']);
        }

        return $q->get();
    }

    public function trouverParUuid(string $uuid): AppelCandidature
    {
        return AppelCandidature::where('uuid', $uuid)->firstOrFail();
    }

    public function creer(array $donnees): AppelCandidature
    {
        // Générer titre par défaut si non spécifié
        if (empty($donnees['titre'])) {
            $donnees['titre'] = $this->genererTitreAuto($donnees);
        }

        return AppelCandidature::create($donnees);
    }

    public function modifier(string $uuid, array $donnees): AppelCandidature
    {
        $appel = $this->trouverParUuid($uuid);
        $appel->update($donnees);
        return $appel->fresh();
    }

    public function marquerTermine(string $uuid): AppelCandidature
    {
        $appel = $this->trouverParUuid($uuid);
        $appel->update(['statut' => 'termine']);
        return $appel->fresh();
    }

    public function supprimer(string $uuid): bool
    {
        $appel = $this->trouverParUuid($uuid);
        return (bool) $appel->delete();
    }

    private function genererTitreAuto(array $d): string
    {
        $cycle = ucfirst($d['cycle'] ?? 'Général');

        switch ($d['cycle'] ?? '') {
            case 'maternelle':
            case 'primaire':
                $cible = !empty($d['est_cycle_unique']) ? 'Cycle unique' : ($d['groupe_nom'] ?? 'Groupe');
                return "Appel à candidature {$cycle} - {$cible}";

            case 'secondaire':
                $promo = $d['promotion_nom'] ?? 'Promotion';
                $serie = !empty($d['serie_nom']) ? " ({$d['serie_nom']})" : '';
                return "Appel à candidature Secondaire - {$promo}{$serie}";

            case 'universitaire':
                $filiere = $d['filiere_complete'] ?? ($d['departement_nom'] ?? 'Filière');
                $niveau = !empty($d['niveau_etude']) ? " [{$d['niveau_etude']}]" : '';
                return "Appel à candidature Université - {$filiere}{$niveau}";

            default:
                return "Appel à candidature {$cycle}";
        }
    }
}
