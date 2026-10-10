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
     * Retrouve un utilisateur (enseignant, parent, administrateur)
     * par son UUID (claim `sub` du JWT Identité).
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
     * Vérifie que l'enseignant existe, est actif et a bien un rôle
     * d'enseignement dans Identité.
     *
     * Règle de sécurité : échec fermé (fail-closed). Identité vide ou
     * injoignable ne vaut PAS autorisation : autoriser par défaut
     * permettrait d'affecter n'importe quel identifiant — y compris
     * inexistant — à un créneau d'emploi du temps.
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
     * Retrouve un parent par email ou téléphone dans Identité.
     */
    public function trouverParentParContact(?string $email, ?string $telephone): ?object
    {
        if (empty($email) && empty($telephone)) {
            return null;
        }

        try {
            $requete = [];
            if (!empty($email))     { $requete['email'] = $email; }
            if (!empty($telephone)) { $requete['telephone'] = $telephone; }

            $donnees = $this->interne->get('identite', '/v1/interne/utilisateurs', $requete);
        } catch (Throwable) {
            return null;
        }

        if (!$donnees) {
            return null;
        }

        $utilisateur = $donnees['donnees'] ?? $donnees;

        return ($utilisateur['role_code'] ?? null) === 'parent'
            ? (object) $utilisateur
            : null;
    }
}
