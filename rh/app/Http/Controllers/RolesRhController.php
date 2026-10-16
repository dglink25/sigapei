<?php

namespace App\Http\Controllers;

use App\Common\Tenant\Contexte;
use App\Exceptions\MetierException;
use App\Integrations\RabbitMqPublisher;
use App\Models\RoleRh;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Rôles RH personnalisés (CDC RH §5.7 / §7.7-7.8).
 *
 * Le fondateur (administrateur) crée un rôle à l'intitulé libre, sélectionne les
 * fonctions du module RH accordées, puis attribue le rôle à des membres du personnel
 * (voir PersonnelRolesRhController). Aucune suppression physique : archivage.
 */
class RolesRhController extends Controller
{
    public function __construct(
        private readonly RabbitMqPublisher $publisher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'statut' => ['nullable', Rule::in(config('rh.statuts_role_rh'))],
            'recherche' => ['nullable', 'string', 'max:100'],
        ]);

        $roles = RoleRh::query()
            ->with('modules')
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->query('statut')))
            ->when($request->filled('recherche'), function ($q) use ($request) {
                $terme = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $request->query('recherche')).'%';
                $q->where('nom', 'ilike', $terme);
            })
            ->orderBy('nom')
            ->paginate($this->parPage($request));

        return $this->page($roles);
    }

    public function voir(RoleRh $roleRh): JsonResponse
    {
        return $this->ok($roleRh->load(['modules', 'personnel']));
    }

    public function creer(Request $request): JsonResponse
    {
        $d = $request->validate([
            'nom' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'fonctions' => ['nullable', 'array'],
            'fonctions.*' => [Rule::in(config('rh.fonctions_rh'))],
        ]);

        if (RoleRh::where('nom', $d['nom'])->exists()) {
            throw MetierException::conflit('Un rôle RH portant ce nom existe déjà.', 'ROLE_DEJA_EXISTANT');
        }

        $fonctions = array_values(array_unique($d['fonctions'] ?? []));

        $role = DB::transaction(function () use ($d, $fonctions) {
            $role = RoleRh::create([
                'nom' => $d['nom'],
                'description' => $d['description'] ?? null,
                'statut' => 'actif',
            ]);

            $role->modules()->createMany($this->lignesFonctions($fonctions));

            return $role;
        });

        $this->publisher->publier('rh.role.cree', [
            'tenant_id' => Contexte::tenantId(),
            'role_rh_uuid' => $role->uuid,
            'fonctions' => $fonctions,
        ]);

        return $this->ok($role->fresh('modules'), 'Rôle RH créé.', 201);
    }

    public function modifier(Request $request, RoleRh $roleRh): JsonResponse
    {
        $d = $request->validate([
            'nom' => ['sometimes', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'statut' => ['sometimes', Rule::in(config('rh.statuts_role_rh'))],
        ]);

        if (array_key_exists('nom', $d) && $d['nom'] !== $roleRh->nom
            && RoleRh::where('nom', $d['nom'])->exists()) {
            throw MetierException::conflit('Un rôle RH portant ce nom existe déjà.', 'ROLE_DEJA_EXISTANT');
        }

        $roleRh->update($d);

        return $this->ok($roleRh->fresh('modules'), 'Rôle RH mis à jour.');
    }

    /**
     * PATCH /v1/roles-rh/{uuid}/modules — sélection des fonctions accordées (CDC RH §5.7).
     */
    public function definirModules(Request $request, RoleRh $roleRh): JsonResponse
    {
        $d = $request->validate([
            'fonctions' => ['present', 'array'],
            'fonctions.*' => [Rule::in(config('rh.fonctions_rh'))],
        ]);

        $fonctions = array_values(array_unique($d['fonctions']));

        DB::transaction(function () use ($roleRh, $fonctions) {
            $roleRh->modules()->delete();
            $roleRh->modules()->createMany($this->lignesFonctions($fonctions));
        });

        $this->publisher->publier('rh.role.modules.definis', [
            'tenant_id' => Contexte::tenantId(),
            'role_rh_uuid' => $roleRh->uuid,
            'fonctions' => $fonctions,
        ]);

        return $this->ok($roleRh->fresh('modules'), 'Fonctions du rôle RH mises à jour.');
    }

    /**
     * POST /v1/roles-rh/{uuid}/archiver — archivage (jamais de suppression).
     */
    public function archiver(RoleRh $roleRh): JsonResponse
    {
        if (! $roleRh->estActif()) {
            throw MetierException::conflit('Ce rôle RH est déjà archivé.', 'ROLE_DEJA_ARCHIVE');
        }

        $roleRh->statut = 'archive';
        $roleRh->save();

        $this->publisher->publier('rh.role.archive', [
            'tenant_id' => Contexte::tenantId(),
            'role_rh_uuid' => $roleRh->uuid,
        ]);

        return $this->ok($roleRh->fresh('modules'), 'Rôle RH archivé.');
    }

    /**
     * @param  list<string>  $fonctions
     * @return list<array{fonction: string, inclus: bool}>
     */
    private function lignesFonctions(array $fonctions): array
    {
        return array_map(
            fn (string $fonction) => ['fonction' => $fonction, 'inclus' => true],
            $fonctions,
        );
    }
}
