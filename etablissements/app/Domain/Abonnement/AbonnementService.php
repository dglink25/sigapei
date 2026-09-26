<?php

namespace App\Domain\Abonnement;

use App\Domain\Etablissement\Etablissement;
use Illuminate\Support\Str;

/** Gestion des plans, modules et abonnements (section 9). */
class AbonnementService
{
    public function plansDisponibles()
    {
        return Plan::where('actif', true)->with('modules')->orderBy('prix')->get();
    }

    /**
     * Souscrit ou change de plan pour un etablissement. N'active pas
     * directement le paiement : cree l'abonnement en statut "essai" (ou
     * "actif" si le plan n'a pas de periode d'essai), a confirmer ensuite
     * via le webhook FedaPay/KkiaPay.
     */
    public function souscrire(Etablissement $etablissement, string $planUuid): Abonnement
    {
        $plan = Plan::where('uuid', $planUuid)->firstOrFail();

        $abonnement = Abonnement::create([
            'etablissement_id' => $etablissement->id,
            'plan_id' => $plan->id,
            'date_debut' => now(),
            'date_fin' => $plan->jours_essai > 0 ? now()->addDays($plan->jours_essai) : null,
            'statut' => $plan->jours_essai > 0 ? 'essai' : 'actif',
        ]);

        foreach ($plan->modules()->where('inclus', true)->get() as $planModule) {
            $etablissement->modulesActifs()->updateOrCreate(
                ['module' => $planModule->module],
                ['statut' => 'actif', 'date_activation' => now()]
            );
        }

        return $abonnement;
    }

    public function enregistrerPaiement(Abonnement $abonnement, float $montant, string $agregateur): AbonnementPaiement
    {
        return $abonnement->paiements()->create([
            'montant' => $montant,
            'agregateur' => $agregateur,
            'statut' => 'en_attente',
        ]);
    }

    public function confirmerPaiement(AbonnementPaiement $paiement): void
    {
        $paiement->update(['statut' => 'approuve']);
        $paiement->abonnement->update(['statut' => 'actif']);
    }
}
