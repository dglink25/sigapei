<?php

namespace App\Domain\PageAccueil;

use App\Domain\Etablissement\Etablissement;
use Illuminate\Database\Eloquent\Model;

/**
 * Configuration de la page d'accueil publique d'un établissement.
 * Une ligne par établissement (upsert via updateOrCreate).
 */
class EtablissementPageAccueil extends Model
{
    protected $table = 'etablissement_page_accueil';

    protected $fillable = [
        'etablissement_id',
        'hero',
        'statistiques',
        'apropos',
        'galerie',
        'actualites',
        'reseaux_sociaux',
    ];

    protected $casts = [
        'hero'          => 'array',
        'statistiques'  => 'array',
        'apropos'       => 'array',
        'galerie'       => 'array',
        'actualites'    => 'array',
        'reseaux_sociaux' => 'array',
    ];

    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }
}
