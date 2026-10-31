<?php

namespace App\Models;

use App\Common\Tenant\AppartientAEtablissement;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Demande d'encaissement transmise au service Paiement pour une facture (suivi et resynchronisation). */
class PaiementEnLigne extends Modele
{
    use AppartientAEtablissement;

    protected $table = 'paiements_en_ligne';

    protected $hidden = ['id', 'etablissement_uuid', 'facture_id'];

    protected $casts = ['montant' => 'integer', 'expire_le' => 'datetime', 'derniere_synchro' => 'datetime'];

    public function facture(): BelongsTo
    {
        return $this->belongsTo(Facture::class, 'facture_id');
    }
}
