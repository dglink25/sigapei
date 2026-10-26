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
        'sigle', 'classe_uuid_externe', 'effectif_previsionnel', 'actif',
    ];
    protected $casts = [
        'actif'                 => 'boolean',
        'effectif_previsionnel' => 'integer',
    ];

    public function annee()       { return $this->belongsTo(AnneeAcademique::class, 'annee_id'); }
    public function niveau()      { return $this->belongsTo(NiveauScolaire::class, 'niveau_id'); }
    public function subdivision() { return $this->belongsTo(SubdivisionPedagogique::class, 'subdivision_id'); }
    public function serie()       { return $this->belongsTo(SerieFiliere::class, 'serie_id'); }

    /**
     * Génère un sigle lisible depuis niveau + série/subdivision.
     * Ex. "CM2 A", "Tle D", "5ème M1"
     */
    public function genererSigle(): string
    {
        $abr = $this->niveau->abreviation ?: $this->niveau->nom;
        if ($this->serie && $this->serie->code) {
            return trim("{$abr} {$this->serie->code}");
        }
        $codeSub = $this->subdivision->code ?: last(explode(' ', $this->subdivision->nom));
        return trim("{$abr} {$codeSub}");
    }

    protected static function booted(): void
    {
        static::creating(function (self $c) {
            if (empty($c->sigle) && $c->niveau) {
                $c->sigle = $c->genererSigle();
            }
        });
    }
}
