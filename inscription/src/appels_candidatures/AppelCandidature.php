<?php

namespace App\appels_candidatures;

use App\common\Traits\HasTenant;
use App\common\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class AppelCandidature extends Model
{
    use HasTenant, HasUuid;

    protected $table = 'inscription.appels_candidatures';

    protected $fillable = [
        'uuid',
        'tenant_id',
        'annee_scolaire',
        'cycle',
        'groupe_id',
        'groupe_nom',
        'est_cycle_unique',
        'promotion_nom',
        'promotion_abreviation',
        'serie_nom',
        'serie_code',
        'cycle_univ',
        'departement_nom',
        'option_nom',
        'niveau_etude',
        'filiere_complete',
        'titre',
        'description',
        'date_debut',
        'date_fin',
        'est_payant',
        'montant',
        'devise',
        'criteres_eligibilite',
        'pieces_fournir',
        'statut',
        'places_disponibles',
    ];

    protected $casts = [
        'tenant_id'            => 'integer',
        'est_cycle_unique'     => 'boolean',
        'est_payant'           => 'boolean',
        'montant'              => 'decimal:2',
        'criteres_eligibilite' => 'array',
        'pieces_fournir'       => 'array',
        'date_debut'           => 'datetime',
        'date_fin'             => 'datetime',
        'places_disponibles'   => 'integer',
    ];

    /**
     * Vérifie si l'appel est actuellement actif (entre date_debut et date_fin, et statut ouvert)
     */
    public function getEstActifAttribute(): bool
    {
        if ($this->statut !== 'ouvert') {
            return false;
        }
        $now = now();
        return $now->gte($this->date_debut) && $now->lte($this->date_fin);
    }
}
