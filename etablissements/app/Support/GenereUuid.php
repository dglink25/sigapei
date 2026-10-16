<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Genere l'uuid cote PHP a la creation du modele.
 *
 * Les colonnes uuid ont bien une valeur par defaut en base, mais Eloquent ne
 * relit pas les colonnes generees par PostgreSQL apres un INSERT (il ne recupere
 * que l'id) : sans ce trait, $modele->uuid vaudrait null juste apres create() /
 * save(), et l'API renverrait par exemple demandeUuid: null.
 */
trait GenereUuid
{
    protected static function bootGenereUuid(): void
    {
        static::creating(function ($modele) {
            if (empty($modele->uuid)) {
                $modele->uuid = (string) Str::uuid();
            }
        });
    }
}
