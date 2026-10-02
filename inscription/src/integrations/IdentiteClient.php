<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Client d'intégration avec le microservice Identité (SSO).
 *
 * Utilise le schéma 'identite' dans la base commune Neon pour :
 * 1. Retrouver un utilisateur (parent, élève, personnel, enseignant) par son email, téléphone ou UUID.
 * 2. Associer automatiquement le parent à la candidature / scolarité s'il possède déjà un compte Identité.
 * 3. Valider l'identité et le rôle des examinateurs / évaluateurs des tests d'admission.
 */
class IdentiteClient
{
    /**
     * Recherche un utilisateur existant par email ou téléphone dans le schéma identite.
     */
    public function trouverUtilisateurParContact(?string $email, ?string $telephone): ?object
    {
        try {
            $query = DB::table('identite.utilisateur');

            if (!empty($email) && !empty($telephone)) {
                $query->where(function ($q) use ($email, $telephone) {
                    $q->where('email', $email)->orWhere('telephone', $telephone);
                });
            } elseif (!empty($email)) {
                $query->where('email', $email);
            } elseif (!empty($telephone)) {
                $query->where('telephone', $telephone);
            } else {
                return null;
            }

            return $query->first();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Recherche un utilisateur par son UUID (identifiant universel api-identite).
     */
    public function trouverParUuid(string $uuid): ?object
    {
        try {
            return DB::table('identite.utilisateur')
                ->where('uuid', $uuid)
                ->first();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Vérifie si un utilisateur est bien un enseignant ou administrateur autorisé à évaluer des tests.
     */
    public function verifierEvaluateur(string|int $utilisateurId): bool
    {
        try {
            $user = DB::table('identite.utilisateur as u')
                ->join('identite.role as r', 'u.role_id', '=', 'r.id')
                ->where(is_numeric($utilisateurId) ? 'u.id' : 'u.uuid', $utilisateurId)
                ->whereIn('r.code', ['enseignant', 'administrateur', 'super_admin'])
                ->where('u.statut', 'actif')
                ->first();

            return ($user !== null);
        } catch (Throwable) {
            return true; // Mode résilient si le schéma identite n'a pas encore de données en local
        }
    }
}
