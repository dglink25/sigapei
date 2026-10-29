<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

/**
 * Classe concrète = niveau × subdivision × (série optionnelle) pour une année.
 * Le sigle est généré automatiquement mais reste modifiable.
 */
class ClasseConfig extends Model
{
    use GenereUuid;

    protected $table  = 'classes_config';
    protected $hidden = ['id', 'etablissement_id', 'annee_id', 'niveau_id', 'subdivision_id', 'serie_id'];

    protected $fillable = [
        'etablissement_id', 'annee_id', 'niveau_id', 'subdivision_id', 'serie_id',
        'nom', 'mode_numerotation', 'sigle', 'classe_uuid_externe', 'effectif_previsionnel', 'actif',
    ];
    protected $casts = [
        'actif'                 => 'boolean',
        'effectif_previsionnel' => 'integer',
    ];

    public function annee()       { return $this->belongsTo(AnneeAcademique::class, 'annee_id'); }
    public function niveau()      { return $this->belongsTo(NiveauScolaire::class, 'niveau_id'); }
    public function subdivision() { return $this->belongsTo(SubdivisionPedagogique::class, 'subdivision_id'); }
    public function serie()       { return $this->belongsTo(SerieFiliere::class, 'serie_id'); }
    public function matieres()    { return $this->hasMany(MatiereConfig::class, 'classe_id'); }

    /**
     * Génère un sigle lisible selon le cycle et la structure :
     * - Maternelle : "M1 A", "M1"
     * - Primaire : "CM2 A", "CM2"
     * - Secondaire : "6ème", "6ème A", "6ème M1", "2nde B1", "Tle D"
     */
    public function genererSigle(): string
    {
        $abr = $this->niveau?->abreviation ?: ($this->niveau?->nom ?? '');

        // 1. Secondaire avec Série (ex: 2nde B1, Tle D)
        if ($this->serie && ($this->serie->code || $this->serie->nom)) {
            $codeSerie = $this->serie->code ?: $this->serie->nom;
            if ($this->nom && preg_match('/\b[0-9]+\b/', $this->nom, $m)) {
                return trim("{$abr} {$codeSerie}{$m[0]}");
            }
            return trim("{$abr} {$codeSerie}");
        }

        // 2. Avec subdivision / groupe (ex: CM2 A, M1 A)
        if ($this->subdivision) {
            $codeSub = $this->subdivision->code ?: last(explode(' ', $this->subdivision->nom));
            return trim("{$abr} {$codeSub}");
        }

        // 3. Cycle unique ou sans subdivision (ex: CM2, 6ème)
        return trim($abr);
    }

    protected static function booted(): void
    {
        static::creating(function (self $c) {
            if (empty($c->sigle) && $c->niveau) {
                $c->sigle = $c->genererSigle();
            }
            if (empty($c->nom)) {
                $c->nom = $c->sigle ?: ($c->niveau?->nom ?? '');
            }
        });
    }
}
