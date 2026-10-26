<?php

namespace App\Domain\ConfigurationAcademique;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class CohorteUniversitaire extends Model
{
    use GenereUuid;

    protected $table  = 'cohortes_universitaires';
    protected $hidden = ['id', 'etablissement_id', 'annee_id', 'filiere_id', 'niveau_id'];

    protected $fillable = [
        'etablissement_id', 'annee_id', 'filiere_id', 'niveau_id',
        'diplome', 'lettre', 'sigle', 'semestres', 'actif',
    ];
    protected $casts = ['actif' => 'boolean'];

    const DIPLOMES = ['licence', 'master', 'doctorat', 'ingenieur', 'bts', 'dut', 'autre'];

    public function annee()   { return $this->belongsTo(AnneeAcademique::class, 'annee_id'); }
    public function filiere() { return $this->belongsTo(SerieFiliere::class, 'filiere_id'); }
    public function niveau()  { return $this->belongsTo(NiveauScolaire::class, 'niveau_id'); }

    public function genererSigle(): string
    {
        $codeF = $this->filiere->code ?: mb_substr($this->filiere->nom, 0, 2);
        $abrN  = $this->niveau->abreviation ?: (string) $this->niveau->ordre;
        return strtoupper(trim("{$codeF}{$abrN}{$this->lettre}"));
    }

    protected static function booted(): void
    {
        static::creating(function (self $c) {
            if (empty($c->sigle) && $c->filiere && $c->niveau) {
                $c->sigle = $c->genererSigle();
            }
        });
    }
}
