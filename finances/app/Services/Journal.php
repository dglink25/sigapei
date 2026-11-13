<?php

namespace App\Services;

use App\Common\Tenant\Contexte;
use Illuminate\Support\Facades\DB;

/** Journal d'audit en ajout seul (CDC §9.2) et numérotation sans trou par établissement et par année. */
class Journal
{
    public function ecrire(string $action, string $cibleType, ?string $cibleUuid, array $details = []): void
    {
        $u = Contexte::utilisateur();
        DB::table('finances.journal_audit')->insert([
            'etablissement_uuid' => Contexte::etablissement(),
            'action' => $action,
            'cible_type' => $cibleType,
            'cible_uuid' => $cibleUuid,
            'auteur_uuid' => $u['uuid'],
            'auteur_role' => $u['roleCode'],
            'details' => json_encode($details, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
        ]);
    }

    /** FA-2026-000042 (facture) ou RE-2026-000007 (reçu) : à appeler dans la transaction qui l'utilise. */
    public function numero(string $nature): string
    {
        $annee = (int) now()->format('Y');
        $valeur = DB::selectOne(
            'INSERT INTO finances.compteurs (etablissement_uuid, nature, annee, valeur) VALUES (?, ?, ?, 1)
             ON CONFLICT (etablissement_uuid, nature, annee) DO UPDATE SET valeur = finances.compteurs.valeur + 1 RETURNING valeur',
            [Contexte::etablissement(), $nature, $annee],
        )->valeur;

        return sprintf('%s-%d-%06d', $nature, $annee, $valeur);
    }
}
