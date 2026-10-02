<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Client d'intégration avec le microservice Identité (SSO).
 *
 * Utilise le schéma 'identite' dans la base commune Neon pour :
 * 1. Vérifier qu'un enseignant assigné à un emploi du temps existe et a le rôle enseignant.
 * 2. Vérifier les comptes parents liés aux apprenants.
 * 3. Récupérer les informations de profil SSO (nom, email, photo) pour l'affichage de l'apprenant.
 */
class IdentiteClient
{
    /**
     * Recherche un utilisateur par son UUID ou son ID interne.
     */
    public function trouverUtilisateur(string|int $idOuUuid): ?object
    {
        try {
            $colonne = is_numeric($idOuUuid) ? 'id' : 'uuid';

            return DB::table('identite.utilisateur as u')
                ->leftJoin('identite.role as r', 'u.role_id', '=', 'r.id')
                ->select([
                    'u.id',
                    'u.uuid',
                    'u.tenant_id',
                    'u.nom_complet',
                    'u.telephone',
                    'u.email',
                    'u.matricule',
                    'u.statut',
                    'u.photo_url',
                    'r.code as role_code',
                    'r.libelle as role_libelle',
                ])
                ->where("u.{$colonne}", $idOuUuid)
                ->first();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Vérifie si un identifiant correspond à un enseignant actif.
     */
    public function estEnseignantValide(string|int $enseignantId): bool
    {
        try {
            $colonne = is_numeric($enseignantId) ? 'u.id' : 'u.uuid';

            $enseignant = DB::table('identite.utilisateur as u')
                ->join('identite.role as r', 'u.role_id', '=', 'r.id')
                ->where($colonne, $enseignantId)
                ->where('r.code', 'enseignant')
                ->where('u.statut', 'actif')
                ->first();

            return ($enseignant !== null);
        } catch (Throwable) {
            return true; // Résilience
        }
    }

    /**
     * Recherche un parent par téléphone ou email.
     */
    public function trouverParentParContact(?string $email, ?string $telephone): ?object
    {
        try {
            $query = DB::table('identite.utilisateur as u')
                ->join('identite.role as r', 'u.role_id', '=', 'r.id')
                ->select(['u.id', 'u.uuid', 'u.nom_complet', 'u.email', 'u.telephone'])
                ->where('r.code', 'parent');

            if (!empty($email) && !empty($telephone)) {
                $query->where(function ($q) use ($email, $telephone) {
                    $q->where('u.email', $email)->orWhere('u.telephone', $telephone);
                });
            } elseif (!empty($email)) {
                $query->where('u.email', $email);
            } elseif (!empty($telephone)) {
                $query->where('u.telephone', $telephone);
            } else {
                return null;
            }

            return $query->first();
        } catch (Throwable) {
            return null;
        }
    }
}
