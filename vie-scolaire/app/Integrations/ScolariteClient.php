<?php

namespace App\Integrations;

use Illuminate\Support\Facades\DB;

/**
 * Jointure directe vers le schema scolarite (section 7.2 du CDC).
 *
 * Le microservice Vie scolaire ne detient ni apprenants, ni classes, ni
 * emplois du temps : chaque lecture se fait par jointure au moment de la
 * requete, sans aucune duplication de donnee. Aucune contrainte FK
 * inter-schema n'est posee en base (section 39 plateforme) ; les noms de
 * tables externes ci-dessous correspondent au contrat du microservice
 * Scolarite et sont parametrables via DB_SCHEMA_SCOLARITE.
 */
class ScolariteClient
{
    private string $schema;

    public function __construct()
    {
        $this->schema = (string) config('vie-scolaire.schemas_externes.scolarite', 'scolarite');
    }

    public function coursParUuid(int $tenantId, string $uuid): ?object
    {
        return $this->first('emplois_du_temps', $tenantId, $uuid);
    }

    public function coursParId(int $tenantId, int $id): ?object
    {
        return $this->first('emplois_du_temps', $tenantId, $id);
    }

    public function apprenantParUuid(int $tenantId, string $uuid): ?object
    {
        return $this->first('apprenants', $tenantId, $uuid);
    }

    public function apprenantParId(int $tenantId, int $id): ?object
    {
        return $this->first('apprenants', $tenantId, $id);
    }

    /**
     * @param  array<int>  $ids
     * @return array<int, object>
     */
    public function apprenantsParIds(int $tenantId, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return DB::table($this->schema.'.apprenants')
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id')
            ->all();
    }

    /**
     * Carte id => uuid des apprenants du schema scolarite.
     *
     * @param  array<int>  $ids
     * @return array<int, string>
     */
    public function uuidsPourApprenants(int $tenantId, array $ids): array
    {
        return collect($this->apprenantsParIds($tenantId, $ids))
            ->map(fn ($apprenant) => $apprenant->uuid)
            ->all();
    }

    /**
     * Identifiants numeriques des apprenants d'une classe (par son uuid).
     *
     * @return array<int>
     */
    public function apprenantIdsParClasseUuid(int $tenantId, string $classeUuid): array
    {
        $classe = $this->first('classes', $tenantId, $classeUuid);
        if (! $classe) {
            return [];
        }

        return DB::table($this->schema.'.apprenants')
            ->where('tenant_id', $tenantId)
            ->where('classe_id', $classe->id)
            ->pluck('id')
            ->all();
    }

    public function classeParUuid(int $tenantId, string $uuid): ?object
    {
        return $this->first('classes', $tenantId, $uuid);
    }

    private function first(string $table, int $tenantId, string|int $key): ?object
    {
        return DB::table($this->schema.'.'.$table)
            ->where('tenant_id', $tenantId)
            ->where(is_string($key) ? 'uuid' : 'id', $key)
            ->first();
    }
}
