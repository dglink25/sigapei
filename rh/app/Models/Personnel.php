<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Membre du personnel d'un établissement (enseignant, administratif, direction...).
 *
 * Identité de référence de la plateforme : les autres microservices ne conservent
 * que l'UUID de cette ligne (jamais de copie). Le compte utilisateur
 * (`utilisateur_uuid`) appartient au microservice Identité : référence externe,
 * jamais de FK locale (règle 4).
 */
class Personnel extends Modele
{
    use AppartientAuTenant;

    protected $table = 'personnel';

    protected $casts = [
        'date_naissance' => 'date:Y-m-d',
        'date_embauche' => 'date:Y-m-d',
        'actif' => 'boolean',
    ];

    public function contrats(): HasMany
    {
        return $this->hasMany(Contrat::class, 'personnel_id');
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(Affectation::class, 'personnel_id');
    }

    public function conges(): HasMany
    {
        return $this->hasMany(Conge::class, 'personnel_id');
    }

    public function rolesRh(): BelongsToMany
    {
        return $this->belongsToMany(RoleRh::class, 'personnel_roles_rh', 'personnel_id', 'role_rh_id')
            ->withPivot('date_attribution')
            ->withTimestamps();
    }

    public function nomComplet(): string
    {
        return trim($this->prenom.' '.$this->nom);
    }

    public function estEnseignant(): bool
    {
        return $this->type_personnel === 'enseignant';
    }
}
