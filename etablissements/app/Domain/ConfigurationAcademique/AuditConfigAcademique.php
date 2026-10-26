<?php

namespace App\Domain\ConfigurationAcademique;

use Illuminate\Database\Eloquent\Model;

class AuditConfigAcademique extends Model
{
    protected $table      = 'audit_config_academique';
    public    $timestamps = false;

    protected $fillable = [
        'etablissement_id', 'action', 'entite', 'entite_uuid', 'detail', 'auteur_uuid',
    ];

    protected $casts = [
        'detail'     => 'array',
        'created_at' => 'datetime',
    ];
}
