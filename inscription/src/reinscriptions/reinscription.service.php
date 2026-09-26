<?php

namespace App\reinscriptions;

use App\common\Services\AuditService;
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
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : 1;
        $apprenantId = $donnees['apprenant_id'];
        $nouvelleClasseId = $donnees['nouvelle_classe_id'];

        // 1. Verifier apprenant existant dans scolarite.apprenants
        $apprenant = DB::table('scolarite.apprenants')
            ->where('id', $apprenantId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$apprenant) {
            throw new Exception("Dossier apprenant introuvable pour la reinscription.");
        }

        // 2. Verifier disponibilite de place dans la nouvelle classe
        $dispo = $this->scolariteClient->verifierDisponibilite($nouvelleClasseId, $tenantId);
        if ($dispo['est_complete']) {
            throw new Exception("Reinscription impossible : la nouvelle classe '{$dispo['nom']}' est complete.");
        }

        return DB::transaction(function () use ($tenantId, $apprenant, $nouvelleClasseId, $donnees, $dispo) {
            // Enregistrer la demande de reinscription
            $reinscription = Reinscription::create([
                'tenant_id' => $tenantId,
                'apprenant_id' => $apprenant->id,
                'ancienne_classe_id' => $apprenant->classe_id,
                'nouvelle_classe_id' => $nouvelleClasseId,
                'annee_scolaire' => $donnees['annee_scolaire'],
                'statut' => 'validee',
                'date_demande' => now(),
            ]);

            // Mettre a jour la classe dans scolarite.apprenants (meme dossier, aucune duplication)
            DB::table('scolarite.apprenants')
                ->where('id', $apprenant->id)
                ->update([
                    'classe_id' => $nouvelleClasseId,
                    'statut' => 'actif',
                    'updated_at' => now(),
                ]);

            // Enregistrer l'historique
            DB::table('scolarite.historique_classes')->insert([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'tenant_id' => $tenantId,
                'apprenant_id' => $apprenant->id,
                'ancienne_classe_id' => $apprenant->classe_id,
                'nouvelle_classe_id' => $nouvelleClasseId,
                'motif' => "Reinscription pour l'annee scolaire {$donnees['annee_scolaire']}",
                'date_transfert' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            AuditService::journaliser(
                'REINSCRIPTION_APPRENANT',
                "Apprenant {$apprenant->nom} {$apprenant->prenom} reinscrit en classe {$dispo['nom']}",
                ['annee_scolaire' => $donnees['annee_scolaire'], 'apprenant_id' => $apprenant->id]
            );

            return [
                'uuid' => $reinscription->uuid,
                'apprenant_id' => $apprenant->id,
                'apprenant_nom' => "{$apprenant->nom} {$apprenant->prenom}",
                'nouvelle_classe' => $dispo['nom'],
                'annee_scolaire' => $donnees['annee_scolaire'],
                'statut' => 'validee',
                'message' => 'Dossier apprenant reconduit avec succes sur la nouvelle annee scolaire.',
            ];
        });
    }
}
