<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\Personnel;
use App\Models\PersonnelRoleRh;
use App\Models\RoleRh;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Attribution des rôles RH aux membres du personnel (CDC RH §5.7 / §7.9).
 *
 * Un même membre peut cumuler plusieurs rôles RH. Le retrait supprime uniquement la
 * ligne d'attribution (lien) : ni le personnel ni le rôle ne sont supprimés.
 */
class PersonnelRolesRhController extends Controller
{
    public function __construct(
        private readonly RabbitMqPublisher $publisher,
    ) {}

    /** GET /v1/personnel/{personnel}/roles-rh — rôles RH d'un membre. */
    public function index(Personnel $personnel): JsonResponse
    {
        return $this->ok(
            $personnel->rolesRh()->with('modules')->orderBy('nom')->get(),
        );
    }

    /** POST /v1/personnel/{personnel}/roles-rh — attribution d'un rôle RH. */
    public function attribuer(Request $request, Personnel $personnel): JsonResponse
    {
        $d = $request->validate([
            'role_rh_uuid' => ['required', 'uuid'],
            'date_attribution' => ['nullable', 'date'],
        ]);

        $role = RoleRh::where('uuid', $d['role_rh_uuid'])->first()
            ?? throw MetierException::introuvable('Rôle RH introuvable.');

        if (! $role->estActif()) {
            throw MetierException::conflit('Ce rôle RH est archivé : attribution impossible.', 'ROLE_ARCHIVE');
        }

        if (PersonnelRoleRh::where('personnel_id', $personnel->id)
            ->where('role_rh_id', $role->id)
            ->exists()) {
            throw MetierException::conflit('Ce rôle RH est déjà attribué à ce membre.', 'ROLE_DEJA_ATTRIBUE');
        }

        $attribution = PersonnelRoleRh::create([
            'personnel_id' => $personnel->id,
            'role_rh_id' => $role->id,
            'date_attribution' => $d['date_attribution'] ?? now()->toDateString(),
        ]);

        $this->publisher->publier('rh.role.attribue', [
            'tenant_id' => Contexte::tenantId(),
            'personnel_uuid' => $personnel->uuid,
            'role_rh_uuid' => $role->uuid,
        ]);

        return $this->ok($attribution->load('roleRh'), 'Rôle RH attribué.', 201);
    }

    /** POST /v1/personnel/{personnel}/roles-rh/{roleRh}/retirer — retrait d'un rôle RH. */
    public function retirer(Personnel $personnel, RoleRh $roleRh): JsonResponse
    {
        $supprime = PersonnelRoleRh::where('personnel_id', $personnel->id)
            ->where('role_rh_id', $roleRh->id)
            ->delete();

        if ($supprime === 0) {
            throw MetierException::introuvable('Ce rôle RH n\'est pas attribué à ce membre.');
        }

        $this->publisher->publier('rh.role.retire', [
            'tenant_id' => Contexte::tenantId(),
            'personnel_uuid' => $personnel->uuid,
            'role_rh_uuid' => $roleRh->uuid,
        ]);

        return $this->ok(null, 'Rôle RH retiré.');
    }
}
