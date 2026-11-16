<?php

namespace App\Models;

use App\Common\Tenant\AppartientAEtablissement;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Règlement d'une facture : en ligne (Paiement) ou saisi à la main (espèces, virement, chèque). */
class Reglement extends Modele
{
    use AppartientAEtablissement;

    protected $table = 'reglements';

    protected $hidden = ['id', 'etablissement_uuid', 'facture_id'];

    protected $casts = ['montant' => 'integer', 'date_reglement' => 'date:Y-m-d', 'valide_le' => 'datetime', 'auto_valide' => 'boolean'];

    public function facture(): BelongsTo
    {
        return $this->belongsTo(Facture::class, 'facture_id');
    }
}
