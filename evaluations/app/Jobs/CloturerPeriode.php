<?php

namespace App\Jobs;

use App\Common\Tenant\Contexte;
use App\Models\Periode;
use App\Services\BulletinService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Clôture d'une période en tâche de fond (CDC §8.1, pics de fin de trimestre) :
 * calcul de toutes les classes puis écriture atomique des instantanés. Idempotent.
 */
class CloturerPeriode implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 600;

    /** @var list<int> */
    public array $backoff = [30, 120];

    public function __construct(
        public readonly int $tenantId,
        public readonly string $periodeUuid,
        public readonly array $utilisateur,
    ) {}

    public function uniqueId(): string
    {
        return $this->tenantId.':'.$this->periodeUuid;
    }

    public function handle(BulletinService $bulletins): void
    {
        Contexte::executerPour($this->tenantId, function () use ($bulletins) {
            $periode = Periode::where('uuid', $this->periodeUuid)->firstOrFail();
            $bulletins->executerCloture($periode, $this->utilisateur['uuid']);
        }, $this->utilisateur);
    }

    public function failed(Throwable $e): void
    {
        Log::error('[CLOTURE_PERIODE_ECHOUEE]', ['tenant_id' => $this->tenantId, 'periode_uuid' => $this->periodeUuid, 'erreur' => $e->getMessage()]);

        Contexte::executerPour($this->tenantId, function () {
            $periode = Periode::where('uuid', $this->periodeUuid)->first();
            if ($periode !== null) {
                app(BulletinService::class)->annulerCloture($periode);
            }
        }, $this->utilisateur);
    }
}
