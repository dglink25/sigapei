<?php

namespace App\Events;

use App\Models\Presence;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Evenement emis a l'enregistrement d'une absence (section 5 du CDC).
 *
 * Consomme par le microservice Communication, qui notifie immediatement
 * le parent rattache — la notification fait partie du meme flux que
 * l'enregistrement, pas d'une etape distincte (section 9).
 */
class AbsenceDeclaree
{
    use Dispatchable;

    public function __construct(
        public readonly int $tenantId,
        public readonly string $presenceUuid,
        public readonly int $apprenantId,
        public readonly int $coursId,
        public readonly string $date,
    ) {}

    public static function depuisPresence(Presence $presence): self
    {
        return new self(
            tenantId: $presence->tenant_id,
            presenceUuid: $presence->uuid,
            apprenantId: $presence->apprenant_id,
            coursId: $presence->cours_id,
            date: $presence->date->toDateString(),
        );
    }
}
