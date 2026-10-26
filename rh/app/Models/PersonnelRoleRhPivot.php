<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Table de liaison `personnel_roles_rh` vue comme pivot Eloquent.
 *
 * Les clés `personnel_id` et `role_rh_id` sont des identifiants internes : elles
 * ne doivent jamais apparaître dans les réponses de l'API publique (qui expose
 * les `uuid`). Le reste du pivot (`date_attribution`, horodatages) est conservé.
 */
class PersonnelRoleRhPivot extends Pivot
{
    protected $table = 'personnel_roles_rh';

    protected $hidden = ['personnel_id', 'role_rh_id'];
}
