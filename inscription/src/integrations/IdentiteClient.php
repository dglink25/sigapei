<?php

namespace App\integrations;

use App\common\Services\InterneClient;
use Throwable;

/**
 * Client d'intégration avec le microservice Identité.
 *
 * Règle n°1 : plus de lecture directe du schéma `identite`. Les profils et
 * rôles se récupèrent via l'API interne d'Identité (`/interne/...`).
 *
 * Règle n°5 : ce client ne valide aucun JWT — il ne fait que transporter
 * l'UUID de l'utilisateur à vérifier.
 */
class IdentiteClient
{
    public function __construct(
        protected InterneClient $interne
    ) {}

    /**
     * Retrouve un utilisateur par son UUID (claim `sub` du JWT).
     */
    public function trouverParUuid(string $uuid): ?object
    {
        if (empty($uuid)) {
            return null;
        }

        try {
            $donnees = $this->interne->get('identite', '/v1/interne/utilisateurs', ['uuid' => $uuid]);
        } catch (Throwable) {
            return null;
        }

        return $donnees ? (object) ($donnees['donnees'] ?? $donnees) : null;
    }

    /**
     * Retrouve un utilisateur par son identifiant interne.
     */
    public function trouverParId(int $id): ?object
    {
        try {
            $donnees = $this->interne->get('identite', '/v1/interne/utilisateurs', ['id' => $id]);
        } catch (Throwable) {
            return null;
        }

        return $donnees ? (object) ($donnees['donnees'] ?? $donnees) : null;
    }

    /**
     * Vérifie qu'un évaluateur (jury / enseignant) existe, est actif et
     * possède un rôle autorisé dans Identité.
     *
     * Règle de sécurité : échec fermé (fail-closed). Un microservice
     * injoignable vaut REFUS, jamais autorisation — sinon n'importe quel
     * identifiant pourrait saisir une note d'admission.
     */
    public function estEnseignantActif(string|int $enseignantRef): bool
    {
        try {
            $requete = is_numeric($enseignantRef)
                ? ['id' => (int) $enseignantRef]
                : ['uuid' => (string) $enseignantRef];

            $donnees = $this->interne->get('identite', '/v1/interne/utilisateurs', $requete);

            if (!$donnees) {
                return false;
            }

            $utilisateur = $donnees['donnees'] ?? $donnees;
            $roleCode    = $utilisateur['role_code'] ?? null;

            return in_array($roleCode, ['enseignant', 'administrateur', 'super_admin'], true)
                && ($utilisateur['statut'] ?? null) === 'actif';
        } catch (Throwable) {
            // Identité injoignable : refus.
            return false;
        }
    }

    /**
     * Recherche un compte parent existant par email ou téléphone.
     * Utilisé lors de la validation d'une candidature pour lier le parent
     * au dossier apprenant.
     */
    public function trouverUtilisateurParContact(?string $email, ?string $telephone): ?object
    {
        if (empty($email) && empty($telephone)) {
            return null;
        }

        try {
            $requete = [];
            if (!empty($email))    { $requete['email'] = $email; }
            if (!empty($telephone)) { $requete['telephone'] = $telephone; }

            $donnees = $this->interne->get('identite', '/v1/interne/utilisateurs', $requete);
        } catch (Throwable) {
            return null;
        }

        return $donnees ? (object) ($donnees['donnees'] ?? $donnees) : null;
    }
}
