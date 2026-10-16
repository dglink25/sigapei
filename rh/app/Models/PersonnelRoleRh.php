<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Attribution d'un rôle RH à un membre du personnel (CDC RH §7.9).
 *
 * Table de liaison many-to-many : un membre du personnel peut cumuler plusieurs
 * rôles RH. `date_attribution` horodate l'attribution ; `id` interne jamais exposé.
 */
class PersonnelRoleRh extends Model
{
    protected $table = 'personnel_roles_rh';

    protected $fillable = ['personnel_id', 'role_rh_id', 'date_attribution'];

    protected $casts = [
        'date_attribution' => 'date:Y-m-d',
    ];

    protected $hidden = ['id'];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class, 'personnel_id');
    }

    public function roleRh(): BelongsTo
    {
        return $this->belongsTo(RoleRh::class, 'role_rh_id');
    }
}
