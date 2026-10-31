<?php

namespace App\Models;

use App\Common\Tenant\AppartientAEtablissement;

/** Frais d'une portée (cycle, niveau ou classe) pour une année scolaire, avec son échéancier. */
class FormuleTarifaire extends Modele
{
    use AppartientAEtablissement;

    protected $table = 'formules_tarifaires';

    protected $casts = ['montant' => 'integer', 'echeancier' => 'array', 'actif' => 'boolean'];
}
