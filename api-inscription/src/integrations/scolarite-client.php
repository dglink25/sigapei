<?php

namespace App\integrations;

use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScolariteClient
{
    /**
     * Verifie la disponibilite de place dans une classe du schema scolarite
     */
    public function verifierDisponibilite(int $classeId, int $tenantId): array
    {
        $classe = DB::table('scolarite.classes')
            ->where('id', $classeId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$classe) {
            throw new Exception("Classe visée (id: {$classeId}) introuvable dans le schéma scolarité.");
        }

        $inscrits = DB::table('scolarite.apprenants')
            ->where('classe_id', $classeId)
            ->where('tenant_id', $tenantId)
            ->where('statut', 'actif')
            ->count();

        $placesRestantes = max(0, $classe->capacite - $inscrits);

        return [
            'classe_id' => $classe->id,
            'uuid' => $classe->uuid,
            'nom' => $classe->nom,
            'cycle' => $classe->cycle,
            'niveau' => $classe->niveau,
            'programme' => $classe->programme,
            'capacite' => (int) $classe->capacite,
            'inscrits' => (int) $inscrits,
            'places_disponibles' => $placesRestantes,
            'est_complete' => ($placesRestantes <= 0),
        ];
    }

    /**
     * Cree l'apprenant dans scolarite.apprenants selon la regle du programme pedagogique
     */
    public function creerApprenant(array $donneesApprenant): array
    {
        $classeId = $donneesApprenant['classe_id'];
        $tenantId = $donneesApprenant['tenant_id'];

        $classe = DB::table('scolarite.classes')
            ->where('id', $classeId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$classe) {
            throw new Exception("Classe de destination introuvable dans la scolarite.");
        }

        // --- REGLE CRUCIALE DU PROGRAMME PEDAGOGIQUE ---
        // Programme beninois : utilisateur_id = NULL quel que soit le cycle (primaire ou secondaire)
        // Programme francais : compte optionnel primaire, compte actif secondaire
        // Cycle universitaire : toujours autonome
        $utilisateurId = null;

        if ($classe->programme === 'beninois') {
            $utilisateurId = null; // Strictement aucun compte de connexion eleve cree
        } elseif ($classe->cycle === 'universitaire') {
            $utilisateurId = $donneesApprenant['utilisateur_id'] ?? null;
        } elseif ($classe->programme === 'francais' && $classe->cycle === 'secondaire') {
            $utilisateurId = $donneesApprenant['utilisateur_id'] ?? null;
        }

        $apprenantUuid = (string) Str::uuid();

        $apprenantId = DB::table('scolarite.apprenants')->insertGetId([
            'uuid' => $apprenantUuid,
            'tenant_id' => $tenantId,
            'classe_id' => $classeId,
            'utilisateur_id' => $utilisateurId,
            'candidature_id' => $donneesApprenant['candidature_id'] ?? null,
            'matricule' => $donneesApprenant['matricule'] ?? ('MAT-' . strtoupper(Str::random(8))),
            'nom' => $donneesApprenant['nom'],
            'prenom' => $donneesApprenant['prenom'],
            'date_naissance' => $donneesApprenant['date_naissance'],
            'sexe' => $donneesApprenant['sexe'] ?? null,
            'statut' => 'actif',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Rattachement du parent si renseigne
        if (!empty($donneesApprenant['parent_id'])) {
            DB::table('scolarite.parents_apprenants')->insert([
                'tenant_id' => $tenantId,
                'parent_id' => $donneesApprenant['parent_id'],
                'apprenant_id' => $apprenantId,
                'lien_parente' => $donneesApprenant['parent_lien'] ?? 'parent',
                'est_responsable_legal' => true,
                'est_contact_urgence' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return [
            'id' => $apprenantId,
            'uuid' => $apprenantUuid,
            'classe_nom' => $classe->nom,
            'programme' => $classe->programme,
            'compte_utilisateur_cree' => ($utilisateurId !== null),
        ];
    }
}
