<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use LogicException;

/** Journal immuable (CDC §9, §16) : verrouillé ici ET par trigger en base. */
class AuditNote extends Modele
{
    use AppartientAuTenant;

    public $timestamps = false;

    protected $table = 'audit_note';

    protected $hidden = ['id', 'tenant_id', 'note_id'];

    protected $casts = [
        'valeur_avant' => 'string',
        'valeur_apres' => 'string',
        'apres_cloture' => 'boolean',
        'cree_le' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('audit_note est immuable.'));
        static::deleting(fn () => throw new LogicException('audit_note est immuable.'));
    }
}
