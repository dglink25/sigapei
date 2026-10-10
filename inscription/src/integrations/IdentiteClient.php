<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Client d'intégration avec le microservice Identité.
 *
 * Accède en lecture directe au schéma `identite` de la base Neon commune.
 * Le JWT émis par api-identite contient : sub (UUID utilisateur), tenantId, roleCode.
 */
class IdentiteClient
{
    /**
     * Retrouve un utilisateur par son UUID (champ `sub` du JWT api-identite).
     */
    public function trouverParUuid(string $uuid): ?object
    {
        try {
            return DB::table('identite.utilisateur as u')
                ->leftJoin('identite.role as r', 'u.role_id', '=', 'r.id')
                ->select([
                    'u.id', 'u.uuid', 'u.tenant_id', 'u.nom_complet',
                    'u.telephone', 'u.email', 'u.matricule', 'u.statut', 'u.photo_url',
                    'r.code as role_code', 'r.libelle as role_libelle',
                ])
                ->where('u.uuid', $uuid)
                ->first();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Retrouve un utilisateur par son ID interne.
     */
    public function trouverParId(int $id): ?object
    {
        try {
            return DB::table('identite.utilisateur as u')
                ->leftJoin('identite.role as r', 'u.role_id', '=', 'r.id')
                ->select([
                    'u.id', 'u.uuid', 'u.nom_complet',
                    'u.telephone', 'u.email', 'u.matricule',
                    'u.statut', 'u.photo_url', 'r.code as role_code',
                ])
                ->where('u.id', $id)
                ->first();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Vérifie que l'évaluateur (jury / enseignant) existe, est actif et possède
     * un rôle autorisé dans le microservice Identité.
     *
     * Règle de sécurité : échec fermé (fail-closed). Une base Identité vide ou
     * injoignable vaut REFUS, jamais autorisation — sinon n'importe quel
     * identifiant pourrait saisir une note d'admission.
     */
    public function estEnseignantActif(string|int $enseignantRef): bool
    {
        try {
            $colonne = is_numeric($enseignantRef) ? 'u.id' : 'u.uuid';

            return DB::table('identite.utilisateur as u')
                ->join('identite.role as r', 'u.role_id', '=', 'r.id')
                ->where($colonne, $enseignantRef)
                ->whereIn('r.code', ['enseignant', 'administrateur', 'super_admin'])
                ->where('u.statut', 'actif')
                ->exists();
        } catch (Throwable $e) {
            Log::error('[IDENTITE] Schema identite inaccessible, evaluateur refuse par defaut.', [
                'evaluateur_ref' => $enseignantRef,
                'erreur'         => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Recherche un compte parent existant par email ou téléphone dans identite.utilisateur.
     * Utilisé lors de la validation d'une candidature pour lier le parent au dossier apprenant.
     */
    public function trouverUtilisateurParContact(?string $email, ?string $telephone): ?object
    {
        if (empty($email) && empty($telephone)) {
            return null;
        }

        try {
            $query = DB::table('identite.utilisateur as u')
                ->leftJoin('identite.role as r', 'u.role_id', '=', 'r.id')
                ->select(['u.id', 'u.uuid', 'u.nom_complet', 'u.email', 'u.telephone', 'r.code as role_code']);

            if (!empty($email) && !empty($telephone)) {
                $query->where(fn($q) => $q->where('u.email', $email)->orWhere('u.telephone', $telephone));
            } elseif (!empty($email)) {
                $query->where('u.email', $email);
            } else {
                $query->where('u.telephone', $telephone);
            }

            return $query->first();
        } catch (Throwable) {
            return null;
        }
    }
}
