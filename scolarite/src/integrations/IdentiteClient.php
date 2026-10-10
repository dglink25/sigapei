<?php

namespace App\integrations;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Client d'intégration avec le microservice Identité.
 * Accès en lecture directe au schéma `identite` de la base Neon.
 * Le JWT émis par api-identite contient : sub (UUID), tenantId, roleCode.
 */
class IdentiteClient
{
    /**
     * Retrouve un utilisateur (enseignant, parent, administrateur)
     * par son UUID (champ `sub` du JWT identite).
     */
    public function trouverParUuid(string $uuid): ?object
    {
        try {
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
                    'u.statut', 'u.photo_url',
                    'r.code as role_code',
                ])
                ->where('u.id', $id)
                ->first();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Vérifie que l'enseignant existe, est actif et a bien un rôle d'enseignement
     * dans le microservice Identité.
     *
     * Règle de sécurité : échec fermé (fail-closed). Une base Identité vide ou
     * injoignable ne vaut PAS autorisation : elle vaut refus. Autoriser par
     * défaut permettrait d'affecter n'importe quel identifiant — y compris
     * inexistant — à un créneau d'emploi du temps.
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
            Log::error('[IDENTITE] Schema identite inaccessible, enseignant refuse par defaut.', [
                'enseignant_ref' => $enseignantRef,
                'erreur'         => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Retrouve un parent par email ou téléphone dans le schéma identite.
     */
    public function trouverParentParContact(?string $email, ?string $telephone): ?object
    {
        if (empty($email) && empty($telephone)) {
            return null;
        }

        try {
            $query = DB::table('identite.utilisateur as u')
                ->join('identite.role as r', 'u.role_id', '=', 'r.id')
                ->select(['u.id', 'u.uuid', 'u.nom_complet', 'u.email', 'u.telephone'])
                ->where('r.code', 'parent');

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
