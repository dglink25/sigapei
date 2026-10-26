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
 *
 * Le contrat de l'API interne RH est l'enveloppe SIGAPEI
 * `{"success","message","data"}` : seules les donnees (`data`) sont
 * exploitees ici ; `data` vaut null quand le personnel est introuvable.
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

        $personnel = $this->donnees($tenantId, ['uuid' => $userUuid]);

        return isset($personnel['id']) ? (int) $personnel['id'] : null;
    }

    public function personnelParId(int $tenantId, int $id): ?object
    {
        $personnel = $this->donnees($tenantId, ['id' => $id]);

        return $personnel === null ? null : (object) $personnel;
    }

    /**
     * Interroge `/interne/personnel` et retourne la charge utile `data`
     * (null si le personnel est introuvable ou reponse inattendue).
     *
     * @param  array<string, mixed>  $filtres
     * @return array<string, mixed>|null
     */
    private function donnees(int $tenantId, array $filtres): ?array
    {
        $corps = $this->interne->get('rh', '/interne/personnel', [
            'tenant_id' => $tenantId,
        ] + $filtres);

        if (! is_array($corps)) {
            return null;
        }

        $donnees = $corps['data'] ?? null;

        return is_array($donnees) ? $donnees : null;
    }
}
