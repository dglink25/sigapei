<?php

namespace Tests\Support;

use App\Integrations\RhClient;
use Illuminate\Support\Facades\DB;

/**
 * Fake du client RH : identite du personnel (auteur d'incident, correcteur)
 * via une table SQLite locale reproduisant le contrat du schema rh.personnel.
 */
class FakeRhClient extends RhClient
{
    public function personnelIdPourUserUuid(int $tenantId, ?string $userUuid): ?int
    {
        if (! $userUuid) {
            return null;
        }

        return DB::table('rh_personnel')
            ->where('tenant_id', $tenantId)
            ->where('uuid', $userUuid)
            ->value('id');
    }

    public function personnelParId(int $tenantId, int $id): ?object
    {
        return DB::table('rh_personnel')
            ->where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();
    }
}
