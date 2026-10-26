<?php

namespace App\Common\Droits;

use App\Models\Personnel;
use App\Models\RoleRh;

/**
 * Moteur de rôles RH configurables (CDC RH §5.7 et §12).
 *
 * Le contrôle d'accès du module croise les rôles RH attribués à un membre du
 * personnel (`personnel_roles_rh`) et les fonctions accordées à ces rôles
 * (`role_rh_modules`) pour déterminer les fonctions du module accessibles à un
 * utilisateur donné, en complément de son rôle générique de plateforme.
 */
class DroitsRh
{
    /**
     * Fonctions du module RH accordées à l'utilisateur (uuid Identité).
     *
     * @return list<string>
     */
    public function fonctionsPourUtilisateur(string $utilisateurUuid): array
    {
        $personnel = Personnel::where('utilisateur_uuid', $utilisateurUuid)->first();
        if ($personnel === null) {
            return [];
        }

        return RoleRh::query()
            ->where('statut', 'actif')
            ->whereHas('personnel', fn ($q) => $q->where('personnel.id', $personnel->id))
            ->with('modules')
            ->get()
            ->flatMap(fn (RoleRh $role) => $role->modules->where('inclus', true)->pluck('fonction'))
            ->unique()
            ->values()
            ->all();
    }

    public function aLaFonction(string $utilisateurUuid, string $fonction): bool
    {
        return in_array($fonction, $this->fonctionsPourUtilisateur($utilisateurUuid), true);
    }
}
