<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * Modèle AuditNote — IMMUABLE.
 * Guide suprême §00 règle 2 + requirements §12.6 + tasks §1.3 :
 * "aucune UPDATE ni DELETE applicatif sur cette table."
 *
 * Toute tentative de mise à jour ou de suppression lève une RuntimeException.
 */
class AuditNote extends Model
{
    public $timestamps = false; // table immuable : pas d'updated_at

    protected $table = 'audit_note';

    protected $fillable = [
        'uuid',
        'note_id',
        'auteur_uuid',
        'valeur_avant',
        'valeur_apres',
        'motif',
        'date',
    ];

    protected $casts = [
        'valeur_avant' => 'float',
        'valeur_apres' => 'float',
        'date'         => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Garde-fous applicatifs — guide tasks §1.3
    // -------------------------------------------------------------------------

    public function save(array $options = []): bool
    {
        if ($this->exists) {
            throw new RuntimeException(
                'AuditNote est immuable : aucune modification autorisée après création.'
            );
        }
        return parent::save($options);
    }

    public function update(array $attributes = [], array $options = []): bool
    {
        throw new RuntimeException(
            'AuditNote est immuable : aucune modification autorisée après création.'
        );
    }

    public function delete(): bool|null
    {
        throw new RuntimeException(
            'AuditNote est immuable : aucune suppression autorisée.'
        );
    }

    public static function boot(): void
    {
        parent::boot();

        // Bloc supplémentaire via Eloquent events
        static::updating(function () {
            throw new RuntimeException(
                'AuditNote est immuable : mise à jour interdite.'
            );
        });

        static::deleting(function () {
            throw new RuntimeException(
                'AuditNote est immuable : suppression interdite.'
            );
        });
    }
}
