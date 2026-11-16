<?php

namespace App\Models;

use App\Common\Tenant\AppartientAEtablissement;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Facture d'un apprenant : montants figés à l'émission ; montant réglé et statut tenus par la base. */
class Facture extends Modele
{
    use AppartientAEtablissement;

    protected $table = 'factures';

    protected $casts = ['montant_total' => 'integer', 'montant_regle' => 'integer', 'annulee_le' => 'datetime'];

    public function lignes(): HasMany
    {
        return $this->hasMany(FactureLigne::class, 'facture_id')->orderBy('ordre');
    }

    public function echeances(): HasMany
    {
        return $this->hasMany(Echeance::class, 'facture_id')->orderBy('rang');
    }

    public function reglements(): HasMany
    {
        return $this->hasMany(Reglement::class, 'facture_id')->orderBy('id');
    }

    public function resteAPayer(): int
    {
        return $this->statut === 'annulee' ? 0 : $this->montant_total - $this->montant_regle;
    }
}
