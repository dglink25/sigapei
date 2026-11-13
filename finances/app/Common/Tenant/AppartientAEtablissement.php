<?php

namespace App\Common\Tenant;

use Illuminate\Database\Eloquent\Builder;
use RuntimeException;

/**
 * Isolation multi-établissement au niveau du modèle :
 *  - toute requête est filtrée sur l'établissement du contexte ;
 *  - sans contexte, AUCUNE ligne (fail closed), sauf en console où le code passe par Contexte::executerPour() ;
 *  - à la création, l'établissement est imposé par le contexte ; il ne change jamais ensuite.
 */
trait AppartientAEtablissement
{
    public static function bootAppartientAEtablissement(): void
    {
        static::addGlobalScope('etablissement', function (Builder $requete) {
            $colonne = $requete->getModel()->getTable().'.etablissement_uuid';
            if (Contexte::aUnEtablissement()) {
                $requete->where($colonne, Contexte::etablissement());
            } elseif (! app()->runningInConsole()) {
                $requete->whereRaw('1 = 0');
            }
        });

        static::creating(function ($modele) {
            if (! Contexte::aUnEtablissement()) {
                throw new RuntimeException('Écriture refusée : aucun contexte établissement.');
            }
            if ($modele->etablissement_uuid !== null && strtolower((string) $modele->etablissement_uuid) !== Contexte::etablissement()) {
                throw new RuntimeException('Écriture refusée : établissement différent du contexte.');
            }
            $modele->etablissement_uuid = Contexte::etablissement();
        });

        static::updating(function ($modele) {
            if ($modele->isDirty('etablissement_uuid')) {
                throw new RuntimeException('L\'établissement d\'une ligne ne peut pas être modifié.');
            }
        });
    }
}
