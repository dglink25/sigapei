<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Matiere extends Model
{
    protected $table    = 'matieres';
    protected $fillable = ['uuid', 'tenant_id', 'nom', 'coefficient_defaut'];
    protected $hidden   = ['id']; // jamais exposer l'id interne — guide §00 règle 3
    protected $casts    = ['coefficient_defaut' => 'float'];

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'matiere_id');
    }
}
