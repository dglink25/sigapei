<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * Evenement emis lorsqu'un apprenant depasse le seuil d'absences sur la
 * periode glissante (sections 4 / 5 du CDC).
 *
 * Consomme par le back-office du censeur (alerte directe, sans attente
 * d'une consultation manuelle). Le seuil est configurable par
 * etablissement, jamais desactivable (section 9).
 */
class AlerteAbsencesDeclenchee
{
    use Dispatchable;

    public function __construct(
        public readonly int $tenantId,
        public readonly int $apprenantId,
        public readonly int $totalAbsences,
        public readonly int $seuil,
        public readonly int $periodeJours,
    ) {}
}
