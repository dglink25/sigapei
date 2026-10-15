<?php

namespace App\Domain\Onboarding;

use App\Support\GenereUuid;
use Illuminate\Database\Eloquent\Model;

class DocumentEtablissement extends Model
{
    use GenereUuid;

    protected $table = 'documents_etablissement';

    protected $fillable = ['demande_id', 'type', 'chemin_stockage', 'mime_type', 'taille_octets'];

    public function demande()
    {
        return $this->belongsTo(DemandeEtablissement::class, 'demande_id');
    }
}
