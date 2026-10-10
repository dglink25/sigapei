<?php

namespace App\reinscriptions;

use App\common\Services\AuditService;
use App\common\Services\TenantResolver;
use App\integrations\ScolariteClient;
use Exception;
use Illuminate\Support\Facades\DB;

class ReinscriptionService
{
    public function __construct(
        protected ScolariteClient $scolariteClient
    ) {}

    public function reconduireApprenant(array $donnees): array
    {
        // Les colonnes scolarite.*.tenant_id sont des bigint alors que le claim
        // `tenantId` du JWT est un UUID : on résout via le référentiel des
        // établissements plutôt que de laisser PostgreSQL rejeter la requête.
        try {
            $tenantId = app(TenantResolver::class)->resoudreCourant();
        } catch (\Throwable $e) {
            throw new Exception(
                "Réinscription impossible : établissement de rattachement introuvable. " . $e->getMessage(),
                0,
                $e
            );
        }

        // 1. Trouver l'apprenant dans scolarite.apprenants par UUID ou ID
        $query = DB::table('scolarite.apprenants')
            ->where('tenant_id', $tenantId);

        if (!empty($donnees['apprenant_uuid'])) {
            $query->where('uuid', $donnees['apprenant_uuid']);
        } else {
            $query->where('id', $donnees['apprenant_id']);
        }

        $apprenant = $query->first();

        if (!$apprenant) {
            throw new Exception("Dossier apprenant introuvable pour la réinscription.");
        }

        // 2. Résoudre la classe de destination
        $classeQuery = DB::table('scolarite.classes')
            ->where('tenant_id', $tenantId);

        if (!empty($donnees['nouvelle_classe_uuid'])) {
            $classeQuery->where('uuid', $donnees['nouvelle_classe_uuid']);
        } else {
            $classeQuery->where('id', $donnees['nouvelle_classe_id']);
        }

        $nouvelleClasse = $classeQuery->first();

        if (!$nouvelleClasse) {
            throw new Exception("Nouvelle classe de destination introuvable.");
        }

        // 3. Vérifier disponibilité de place via ScolariteClient
        $dispo = $this->scolariteClient->verifierDisponibilite($nouvelleClasse->uuid, $tenantId);
        if ($dispo['est_complete']) {
            throw new Exception("Réinscription impossible : la classe '{$dispo['nom']}' a atteint sa capacité maximale ({$dispo['capacite']} places).");
        }

        return DB::transaction(function () use ($tenantId, $apprenant, $nouvelleClasse, $donnees, $dispo) {
            // Enregistrer la demande de réinscription
            $reinscription = Reinscription::create([
                'tenant_id'          => $tenantId,
                'apprenant_id'       => $apprenant->id,
                'ancienne_classe_id' => $apprenant->classe_id,
                'nouvelle_classe_id' => $nouvelleClasse->id,
                'annee_scolaire'     => $donnees['annee_scolaire'],
                'statut'             => 'validee',
                'date_demande'       => now(),
            ]);

            // Mettre à jour la classe dans scolarite.apprenants (même dossier, aucune duplication)
            DB::table('scolarite.apprenants')
                ->where('id', $apprenant->id)
                ->update([
                    'classe_id'  => $nouvelleClasse->id,
                    'statut'     => 'actif',
                    'updated_at' => now(),
                ]);

            // Enregistrer l'historique
            DB::table('scolarite.historique_classes')->insert([
                'uuid'               => (string) \Illuminate\Support\Str::uuid(),
                'tenant_id'          => $tenantId,
                'apprenant_id'       => $apprenant->id,
                'ancienne_classe_id' => $apprenant->classe_id,
                'nouvelle_classe_id' => $nouvelleClasse->id,
                'motif'              => "Réinscription pour l'année scolaire {$donnees['annee_scolaire']}",
                'date_transfert'     => now(),
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);

            AuditService::journaliser(
                'REINSCRIPTION_APPRENANT',
                "Apprenant {$apprenant->nom} {$apprenant->prenom} réinscrit en classe {$dispo['nom']}",
                [
                    'annee_scolaire' => $donnees['annee_scolaire'],
                    'apprenant_id'   => $apprenant->id,
                    'apprenant_uuid' => $apprenant->uuid,
                    'nouvelle_classe' => $dispo['nom'],
                ]
            );

            return [
                'uuid'            => $reinscription->uuid,
                'apprenant_uuid'  => $apprenant->uuid,
                'apprenant_nom'   => "{$apprenant->nom} {$apprenant->prenom}",
                'nouvelle_classe' => $dispo['nom'],
                'annee_scolaire'  => $donnees['annee_scolaire'],
                'statut'          => 'validee',
                'message'         => 'Dossier apprenant reconduit avec succès sur la nouvelle année scolaire sans duplication.',
            ];
        });
    }
}
