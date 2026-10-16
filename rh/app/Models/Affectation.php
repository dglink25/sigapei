<?php

namespace App\Models;

use App\Common\Tenant\AppartientAuTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Affectation d'un membre du personnel à une matière dans une classe, pour une
 * année scolaire donnée.
 *
 * SOURCE DE VÉRITÉ de la règle 5 de la plateforme : un enseignant ne peut agir
 * que sur les couples (matière, classe) qui lui sont affectés. `matiere_uuid`
 * (schéma `evaluations.matieres`) et `classe_uuid` (schéma `scolarite.classes`)
 * sont des UUID EXTERNES : aucune FK locale, aucune copie (règle 4).
 */
class Affectation extends Modele
{
    use AppartientAuTenant;

    protected $table = 'affectations';

    protected $casts = [
        'date_debut' => 'date:Y-m-d',
        'date_fin' => 'date:Y-m-d',
        'heures_semaine' => 'integer',
    ];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class, 'personnel_id');
    }

    public function estActive(): bool
    {
        return $this->statut === 'actif';
    }
}
