<?php

namespace App\integrations;

use App\common\Services\TenantResolver;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Client d'intégration avec le microservice Scolarité.
 *
 * Accès en DB directe sur le schéma `scolarite` de la base Neon commune.
 * Supporte indifféremment les identifiants de classe numériques (id) ou UUIDs.
 */
class ScolariteClient
{
    /**
     * Recherche une classe soit par UUID, soit par ID entier.
     *
     * Sécurité multi-tenant : le filtre `tenant_id` est TOUJOURS appliqué.
     * Si le tenant transmis n'est pas exploitable (UUID non résolu, valeur
     * absente), on lève une exception plutôt que de renvoyer la classe sans
     * filtre — sinon un directeur du tenant A pourrait cibler une classe du
     * tenant B. Le `is_numeric()` qui désactivait silencieusement la garde a
     * été supprimé.
     */
    public function trouverClasse(string|int $classeRef, mixed $tenantId = null): ?object
    {
        $tenantInt = $this->resoudreTenantId($tenantId);

        $query = DB::table('scolarite.classes')
            ->where('tenant_id', $tenantInt);

        if (is_numeric($classeRef)) {
            $query->where('id', (int) $classeRef);
        } else {
            $query->where('uuid', (string) $classeRef);
        }

        return $query->first();
    }

    /**
     * Normalise le tenant en entier via le référentiel des établissements,
     * ou lève si impossible. Accepte un UUID comme un entier.
     */
    protected function resoudreTenantId(mixed $tenantId): int
    {
        if ($tenantId === null || $tenantId === '') {
            throw new Exception("Tenant introuvable : le contexte d'authentification ne fournit aucun tenant.");
        }

        try {
            return app(TenantResolver::class)->resoudre($tenantId);
        } catch (Exception $e) {
            throw new Exception(
                "Tenant non résolu ({$tenantId}) : " . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Vérifie la disponibilité de place dans une classe.
     * Accepte soit l'UUID soit l'ID entier de la classe.
     */
    public function verifierDisponibilite(string|int $classeRef, mixed $tenantId = null): array
    {
        $tenantInt = $this->resoudreTenantId($tenantId);
        $classe = $this->trouverClasse($classeRef, $tenantInt);

        if (!$classe) {
            throw new Exception("Classe visée (réf: {$classeRef}) introuvable dans le schéma scolarité.");
        }

        $inscrits = DB::table('scolarite.apprenants')
            ->where('classe_id', $classe->id)
            ->where('tenant_id', $tenantInt)
            ->where('statut', 'actif')
            ->count();

        $placesRestantes = max(0, (int) $classe->capacite - $inscrits);

        return [
            'classe_id'          => $classe->id,
            'uuid'               => $classe->uuid,
            'nom'                => $classe->nom,
            'cycle'              => $classe->cycle,
            'niveau'             => $classe->niveau,
            'programme'          => $classe->programme,
            'capacite'           => (int) $classe->capacite,
            'inscrits'           => (int) $inscrits,
            'places_disponibles' => $placesRestantes,
            'est_complete'       => ($placesRestantes <= 0),
        ];
    }

    /**
     * Crée l'apprenant dans scolarite.apprenants selon la règle du programme pédagogique.
     *
     * Règle absolue (immuable) :
     *   - Programme béninois                    → utilisateur_id = NULL (jamais de compte élève)
     *   - Programme français + cycle secondaire → utilisateur_id = sub identite si fourni
     *   - Cycle universitaire (tout programme)  → utilisateur_id = sub identite si fourni
     */
    public function creerApprenant(array $donnees): array
    {
        $classeRef = $donnees['classe_uuid'] ?? $donnees['classe_id'] ?? null;
        $tenantInt = $this->resoudreTenantId($donnees['tenant_id'] ?? null);

        // Le tenant est résolu AVANT la lecture de la classe : une classe
        // appartenant à un autre établissement n'est jamais sélectionnable.
        $classe = $this->trouverClasse($classeRef, $tenantInt);

        if (!$classe) {
            throw new Exception("Classe de destination introuvable dans la scolarité.");
        }

        // --- RÈGLE PÉDAGOGIQUE CRITIQUE ---
        $utilisateurId = null;

        if ($classe->programme === 'beninois') {
            $utilisateurId = null; // Strictement aucun compte élève pour le programme béninois
        } elseif ($classe->cycle === 'universitaire') {
            $utilisateurId = $donnees['utilisateur_identite_id'] ?? null;
        } elseif ($classe->programme === 'francais' && $classe->cycle === 'secondaire') {
            $utilisateurId = $donnees['utilisateur_identite_id'] ?? null;
        }

        $apprenantUuid = (string) Str::uuid();

        $apprenantId = DB::table('scolarite.apprenants')->insertGetId([
            'uuid'           => $apprenantUuid,
            'tenant_id'      => $tenantInt,
            'classe_id'      => $classe->id,
            'utilisateur_id' => $utilisateurId,
            'candidature_id' => $donnees['candidature_id'] ?? null,
            'matricule'      => $donnees['matricule'] ?? ('MAT-' . strtoupper(Str::random(8))),
            'nom'            => $donnees['nom'],
            'prenom'         => $donnees['prenom'],
            'date_naissance' => $donnees['date_naissance'],
            'sexe'           => $donnees['sexe'] ?? null,
            'statut'         => 'actif',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        // Rattachement du parent identite si son ID interne est disponible
        if (!empty($donnees['parent_identite_id'])) {
            DB::table('scolarite.parents_apprenants')->insert([
                'tenant_id'             => $tenantInt,
                'parent_id'             => $donnees['parent_identite_id'],
                'apprenant_id'          => $apprenantId,
                'lien_parente'          => $donnees['parent_lien'] ?? 'parent',
                'est_responsable_legal' => true,
                'est_contact_urgence'   => true,
                'created_at'            => now(),
                'updated_at'            => now(),
            ]);
        }

        return [
            'id'                     => $apprenantId,
            'uuid'                   => $apprenantUuid,
            'classe_nom'             => $classe->nom,
            'programme'              => $classe->programme,
            'compte_utilisateur_cree' => ($utilisateurId !== null),
        ];
    }
}
