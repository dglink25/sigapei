<?php

use App\Common\Tenant\Contexte;
use App\Models\ContestationNote;
use App\Services\ContestationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
| Escalade des contestations sans réponse après le délai paramétré (CDC §9).
| Tourne tenant par tenant pour que chaque requête reste filtrée.
*/
Artisan::command('evaluations:escalader-contestations', function (ContestationService $service) {
    $tenants = ContestationNote::withoutGlobalScope('tenant')
        ->whereIn('statut', ['ouverte', 'en_examen'])->whereNull('escaladee_le')
        ->distinct()->pluck('tenant_id');

    $total = 0;
    foreach ($tenants as $tenantId) {
        $total += Contexte::executerPour((int) $tenantId, fn () => $service->escaladerEnRetard());
    }

    $this->info("{$total} contestation(s) escaladée(s).");
})->purpose('Escalade les contestations de notes restées sans réponse');

Schedule::command('evaluations:escalader-contestations')->hourly()->withoutOverlapping()->onOneServer();
