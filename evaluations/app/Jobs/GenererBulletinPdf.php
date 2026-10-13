<?php

namespace App\Jobs;

use App\Services\TemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Job asynchrone de génération PDF d'un bulletin.
 * Guide suprême design §2.7 + tasks §5.2 :
 * - File RabbitMQ (broker mutualisé plateforme).
 * - Durée cible < 5 s (guide NFR §18).
 * - Si correction post-publication : nouvelle version, ancienne archivée.
 */
class GenererBulletinPdf implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries   = 3;
    public int $timeout = 30; // secondes — guide NFR < 5 s de génération effective

    public function __construct(
        public readonly string $bulletinUuid,
        public readonly string $tenantId,
        public readonly string $cycle,
        public readonly ?string $ancienDocumentUuid = null // si correction post-publication
    ) {}

    public function handle(TemplateService $template): void
    {
        // TODO : récupérer données du bulletin (CalculService ou instantané),
        // appeler TemplateService::genererPdf(), mettre à jour bulletins.pdf_document_uuid,
        // archiver l'ancienne version si $ancienDocumentUuid non null
        throw new \RuntimeException('Non implémenté.');
    }
}
