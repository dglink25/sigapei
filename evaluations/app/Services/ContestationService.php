<?php

namespace App\Services;

/**
 * Workflow de contestation de note.
 *
 * Guide suprême design §2.4 + requirements §14 :
 * Statuts : ouverte → en_examen → resolue | rejetee
 * Escalade à l'administrateur/censeur après délai configurable (DECISION-14).
 */
class ContestationService
{
    /**
     * Ouvre une contestation.
     * Guide tasks §6.2 — Exigence 14.
     *
     * @param string $noteUuid
     * @param string $demandeurUuid
     * @param string $motif
     * @param string $tenantId
     */
    public function ouvrir(string $noteUuid, string $demandeurUuid, string $motif, string $tenantId): void
    {
        // TODO : créer contestation_note statut=ouverte, notifier enseignant
        throw new \RuntimeException('Non implémenté.');
    }

    /**
     * Escalade les contestations sans réponse après le délai configurable.
     * Guide requirements §14.3 — DECISION-14 (délai à trancher).
     */
    public function escaladerSansReponse(): void
    {
        // TODO(DECISION-14) : délai configurable à trancher
        throw new \RuntimeException('TODO(DECISION-14).');
    }
}
