<?php

namespace App\emplois_du_temps;

use App\classes\Classe;
use App\common\Services\AuditService;
use App\common\Services\TenantResolver;
use App\integrations\IdentiteClient;
use Exception;
use Illuminate\Database\Eloquent\Collection;

class EmploiDuTempsService
{
    public function __construct(
        protected EmploiDuTempsRepository $repository,
        protected IdentiteClient $identiteClient
    ) {}

    public function lister(array $filtres = []): Collection
    {
        return $this->repository->lister($filtres);
    }

    /**
     * Crée ou modifie un créneau de l'emploi du temps.
     * Vérifie que l'enseignant assigné est bien enregistré dans identite avec le rôle enseignant.
     */
    public function creerOuModifier(array $donnees): EmploiDuTemps
    {
        // Résoudre la classe via UUID ou ID
        $classe = null;
        if (!empty($donnees['classe_uuid'])) {
            $classe = Classe::where('uuid', $donnees['classe_uuid'])->first();
            if (!$classe) {
                throw new Exception("Classe spécifiée introuvable.");
            }
            $donnees['classe_id'] = $classe->id;
            unset($donnees['classe_uuid']);
        } elseif (!empty($donnees['classe_id'])) {
            $classe = Classe::find($donnees['classe_id']);
        }

        // Définir le tenant_id à partir du tenant courant ou de la classe.
        //
        // Sécurité multi-tenant : on n'attribue JAMAIS un tenant par défaut.
        // L'ancien code faisait `is_numeric($tenantRef) ? (int)$tenantRef : 1`,
        // ce qui écrivait tout créneau issu d'un tenant UUID dans l'établissement
        // n°1 — une fuite inter-tenant silencieuse. Si le tenant est absent ou
        // inexploitable, on refuse l'opération.
        if (empty($donnees['tenant_id'])) {
            // Résolution UUID → entier via le référentiel des établissements.
            // L'ancien code faisait `is_numeric($tenantRef) ? (int)$tenantRef : 1`,
            // ce qui écrivait tout créneau issu d'un tenant UUID dans
            // l'établissement n°1 : une fuite inter-tenant silencieuse.
            $tenantRef = app()->bound('current_tenant_id')
                ? app('current_tenant_id')
                : ($classe?->tenant_id ?? null);

            try {
                $donnees['tenant_id'] = app(TenantResolver::class)->resoudre($tenantRef);
            } catch (\Throwable $e) {
                throw new Exception(
                    "Impossible de rattacher le créneau à un établissement : " . $e->getMessage(),
                    0,
                    $e
                );
            }
        }

        // Validation identite : l'enseignant doit exister et être actif
        if (!empty($donnees['enseignant_id'])) {
            $valide = $this->identiteClient->estEnseignantActif($donnees['enseignant_id']);
            if (!$valide) {
                throw new Exception("L'enseignant assigné (id: {$donnees['enseignant_id']}) n'existe pas ou n'est pas actif dans le système Identité.");
            }
        }

        $creneau = $this->repository->creerOuModifier($donnees);

        AuditService::journaliser('GESTION_EMPLOI_DU_TEMPS', "Creneau {$creneau->jour} {$creneau->heure_debut}-{$creneau->heure_fin}", [
            'classe_id'     => $creneau->classe_id,
            'enseignant_id' => $creneau->enseignant_id,
            'salle'         => $creneau->salle,
        ]);

        return $creneau;
    }
}
