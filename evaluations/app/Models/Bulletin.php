<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Instantané archivé à la clôture, versionné, immuable (sauf ajout du PDF). */
class Bulletin extends Modele
{
    use AppartientAuTenant;

    public $timestamps = false;

    protected $table = 'bulletins';

    protected $hidden = ['id', 'tenant_id', 'periode_id', 'empreinte'];

    protected $casts = [
        'version' => 'integer',
        'moyenne' => 'string',
        'moyenne_classe' => 'string',
        'rang' => 'integer',
        'effectif' => 'integer',
        'ex_aequo' => 'boolean',
        'contenu' => 'array',
        'genere_le' => 'datetime',
    ];

    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class, 'periode_id');
    }
}
