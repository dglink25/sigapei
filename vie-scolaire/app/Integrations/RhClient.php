<?php

namespace App\Integrations;

/**
 * Lecture des donnees RH (identite du personnel).
 *
 * Regle n°1 : plus aucune jointure SQL vers le schema `rh`. La
 * resolution du claim `sub` (uuid utilisateur transmis par la
 * passerelle) en identifiant numerique du personnel passe par l'API
 * interne du microservice RH (`/interne/...` + `X-Internal-Secret`).
 *
 * Le microservice Vie scolaire ne conserve que cet identifiant externe
 * (auteur_id, corrige_par_id, sanction_appliquee_par_id).
 */
class RhClient
{
    public function __construct(
        private readonly InterneClient $interne,
    ) {}

    public function personnelIdPourUserUuid(int $tenantId, ?string $userUuid): ?int
    {
        if (! $userUuid) {
            return null;
        }

        $personnel = $this->interne->get('rh', '/interne/personnel', [
            'tenant_id' => $tenantId,
            'uuid' => $userUuid,
        ]);

        return $personnel ? (int) $personnel->id : null;
    }

    public function personnelParId(int $tenantId, int $id): ?object
    {
        return $this->interne->get('rh', '/interne/personnel', [
            'tenant_id' => $tenantId,
            'id' => $id,
        ]);
    }
}
