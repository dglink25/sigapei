<?php

namespace App\Domain\ConfigurationAcademique;

use App\Domain\Etablissement\Etablissement;
use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

/**
 * Année académique d'un établissement.
 *
 * Règle : jamais supprimée physiquement. Seule la suspension est autorisée.
 * Le statut est calculé dynamiquement depuis les dates et le flag `suspendu` :
 *   - suspendu (prioritaire sur les dates)
 *   - en_cours (aujourd'hui entre date_debut et date_fin, bornes incluses)
 *   - a_venir  (date_debut non encore atteinte)
 *   - termine  (date_fin dépassée)
 */
class AnneeAcademique extends Model
{
    use GenereUuid;

    protected $table = 'annees_academiques';

    protected $hidden = ['id', 'etablissement_id'];

    protected $fillable = [
        'etablissement_id', 'date_debut', 'date_fin',
        'libelle', 'suspendu', 'note_suspension',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin'   => 'date',
        'suspendu'   => 'boolean',
    ];

    // ── Relations ───────────────────────────────────────────────────────

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }

    public function cyclesConfig()
    {
        return $this->hasMany(CycleConfig::class, 'annee_id');
    }

    public function classes()
    {
        return $this->hasMany(ClasseConfig::class, 'annee_id');
    }

    // ── Statut calculé ──────────────────────────────────────────────────

    /**
     * Retourne le statut dynamique sans jamais persister de valeur en base.
     * Utilisé dans les sérialiseurs et les filtres de l'API.
     */
    public function getStatutAttribute(): string
    {
        if ($this->suspendu) {
            return 'suspendu';
        }

        $aujourd_hui = now()->toDateString();

        if ($aujourd_hui < $this->date_debut->toDateString()) {
            return 'a_venir';
        }

        if ($aujourd_hui > $this->date_fin->toDateString()) {
            return 'termine';
        }

        return 'en_cours';
    }

    public function getEstActiveAttribute(): bool
    {
        return $this->statut === 'en_cours';
    }

    /**
     * Génère le libellé "2026-2027" à partir des dates si non renseigné.
     */
    public function genererLibelle(): string
    {
        return $this->date_debut->year . '-' . $this->date_fin->year;
    }

    protected static function booted(): void
    {
        static::creating(function (self $annee) {
            if (empty($annee->libelle)) {
                $annee->libelle = $annee->genererLibelle();
            }
        });
    }
}
