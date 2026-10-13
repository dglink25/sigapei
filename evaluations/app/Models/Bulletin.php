<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bulletin extends Model
{
    protected $table    = 'bulletins';
    protected $hidden   = ['id'];
    protected $fillable = [
        'uuid', 'tenant_id', 'apprenant_uuid', 'periode', 'annee_scolaire',
        'moyenne', 'rang', 'mention', 'statut', 'pdf_document_uuid',
    ];
    protected $casts = ['moyenne' => 'float'];
}
