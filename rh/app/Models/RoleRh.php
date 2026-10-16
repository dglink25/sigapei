<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Rôle RH personnalisé (CDC RH §5.7 et §7.7).
 *
 * Le fondateur (administrateur de l'établissement) crée librement des rôles
 * (ex. « Chef de département ») et sélectionne les fonctions du module RH
 * accordées via `role_rh_modules`. Un rôle est ensuite attribué à des membres
 * du personnel (`personnel_roles_rh`) ; il n'est jamais supprimé physiquement
 * (archivage via `statut = archive`).
 */
class RoleRh extends Modele
{
    use AppartientAuTenant;

    protected $table = 'roles_rh';

    public function modules(): HasMany
    {
        return $this->hasMany(RoleRhModule::class, 'role_rh_id');
    }

    public function personnel(): BelongsToMany
    {
        return $this->belongsToMany(Personnel::class, 'personnel_roles_rh', 'role_rh_id', 'personnel_id')
            ->withPivot('date_attribution')
            ->withTimestamps();
    }

    /** @return list<string> fonctions du module RH actives pour ce rôle. */
    public function fonctionsActives(): array
    {
        return $this->modules
            ->where('inclus', true)
            ->pluck('fonction')
            ->values()
            ->all();
    }

    public function estActif(): bool
    {
        return $this->statut === 'actif';
    }
}
