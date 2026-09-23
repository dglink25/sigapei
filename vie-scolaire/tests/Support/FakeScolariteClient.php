<?php

namespace Tests\Support;

use App\Integrations\ScolariteClient;
use Illuminate\Support\Facades\DB;

/**
 * Fake du client Scolarite, alimente par des tables SQLite locales
 * (tests) qui reproduisent le contrat du schema scolarite (apprenants,
 * classes, emplois_du_temps). Les tests Feature n'ont pas besoin du
 * PostgreSQL de la plateforme.
 */
class FakeScolariteClient extends ScolariteClient
{
    public function coursParUuid(int $tenantId, string $uuid): ?object
    {
        return DB::table('scolarite_emplois_du_temps')
            ->where('tenant_id', $tenantId)
            ->where('uuid', $uuid)
            ->first();
    }

    public function coursParId(int $tenantId, int $id): ?object
    {
        return DB::table('scolarite_emplois_du_temps')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();
    }

    public function apprenantParUuid(int $tenantId, string $uuid): ?object
    {
        return DB::table('scolarite_apprenants')
            ->where('tenant_id', $tenantId)
            ->where('uuid', $uuid)
            ->first();
    }

    public function apprenantParId(int $tenantId, int $id): ?object
    {
        return DB::table('scolarite_apprenants')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();
    }

    public function apprenantsParIds(int $tenantId, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table('scolarite_apprenants')
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id')
            ->all();
    }

    public function uuidsPourApprenants(int $tenantId, array $ids): array
    {
        return collect($this->apprenantsParIds($tenantId, $ids))
            ->map(fn ($apprenant) => $apprenant->uuid)
            ->all();
    }

    public function classeParUuid(int $tenantId, string $uuid): ?object
    {
        return DB::table('scolarite_classes')
            ->where('tenant_id', $tenantId)
            ->where('uuid', $uuid)
            ->first();
    }

    public function apprenantIdsParClasseUuid(int $tenantId, string $classeUuid): array
    {
        $classe = $this->classeParUuid($tenantId, $classeUuid);
        if (! $classe) {
            return [];
        }

        return DB::table('scolarite_apprenants')
            ->where('tenant_id', $tenantId)
            ->where('classe_id', $classe->id)
            ->pluck('id')
            ->all();
    }
}
