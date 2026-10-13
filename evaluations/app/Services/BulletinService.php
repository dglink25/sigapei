<?php

namespace App\Services;

use App\Integrations\RabbitMqPublisher;

/**
 * Orchestre la clôture de période, l'archivage de l'instantané et la génération du PDF.
 *
 * Guide suprême design §2.2 :
 * - Clôture : appelle CalculService pour chaque apprenant, écrit l'instantané (bulletins),
 *   publie l'événement, lance GenererBulletinPdf.
 * - Lecture : période ouverte → recalcul à la volée ; période clôturée → instantané/Redis.
 */
class BulletinService
{
    public function __construct(
        private readonly CalculService $calcul,
        private readonly RabbitMqPublisher $publisher,
    ) {}

    /**
     * Clôture une période pour tous les apprenants d'une classe.
     * Guide tasks §5.1 — Exigence 9.
     *
     * @param string $periodeUuid
     * @param string $tenantId
     */
    public function cloturerPeriode(string $periodeUuid, string $tenantId): void
    {
        // TODO(DECISION-15) : résoudre la ressource "période" (table dédiée ou champ texte ?)
        // avant implémentation complète.
        throw new \RuntimeException('TODO(DECISION-15) : structure de la ressource période à trancher.');
    }

    /**
     * Retourne le bulletin d'un apprenant (calculé à la volée ou instantané selon statut période).
     * Guide requirements §11 — Exigence 11.
     *
     * @param string $apprenantUuid
     * @param string $periode
     * @param string $tenantId
     * @return array
     */
    public function getBulletin(string $apprenantUuid, string $periode, string $tenantId): array
    {
        // TODO : vérifier Redis d'abord (période clôturée), sinon calculer à la volée
        throw new \RuntimeException('Non implémenté.');
    }
}
