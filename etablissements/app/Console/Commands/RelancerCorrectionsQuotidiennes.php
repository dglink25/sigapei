<?php

namespace App\Console\Commands;

use App\Domain\Validation\ValidationService;
use Illuminate\Console\Command;

/**
 * Relance quotidienne des dossiers en attente de correction (section 7.3).
 * Planifiee chaque jour a 18h59 (voir routes/console.php).
 */
class RelancerCorrectionsQuotidiennes extends Command
{
    protected $signature = 'demandes:relancer-corrections';

    protected $description = "Relance (WhatsApp + e-mail) tous les dossiers au statut 'correction_demandee'.";

    public function handle(ValidationService $validationService): int
    {
        $nombre = $validationService->relancerCorrectionsEnAttente();
        $this->info("{$nombre} dossier(s) relance(s).");

        return self::SUCCESS;
    }
}
