<?php

namespace App\Integrations;

use Illuminate\Support\Facades\DB;

/**
 * Jointure directe vers le schema rh (section 7.2 / 11 du CDC).
 *
 * Fournit l'identite du personnel (enseignant, censeur) a l'origine d'un
 * incident disciplinaire ou d'une correction. Le claim sub transmis par la
 * passerelle ("uuid" utilisateur) est resolu en identifiant numerique du
 * personnel dans le schema rh ; le microservice Vie scolaire ne stocke que
 * cet identifiant numerique externe (auteur_id, corrige_par_id, ...).
 */
class RhClient
{
    private string $schema;

    public function __construct()
    {
        $this->schema = (string) config('vie-scolaire.schemas_externes.rh', 'rh');
    }

    public function personnelIdPourUserUuid(int $tenantId, ?string $userUuid): ?int
    {
        if (! $userUuid) {
            return null;
        }

        $personnel = $this->first('personnel', $tenantId, $userUuid);

        return $personnel?->id;
    }

    public function personnelParId(int $tenantId, int $id): ?object
    {
        return DB::table($this->schema.'.personnel')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();
    }

    private function first(string $table, int $tenantId, string $key): ?object
    {
        return DB::table($this->schema.'.'.$table)
            ->where('tenant_id', $tenantId)
            ->where('uuid', $key)
            ->first();
    }
}
