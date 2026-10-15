<?php

namespace App\Integrations;

/**
 * Lecture des donnees Scolarite (apprenants, classes, emplois du temps).
 *
 * Regle n°1 : le microservice Vie scolaire ne detient ni apprenants, ni
 * classes, ni emplois du temps, et ne fait plus de jointure SQL vers le
 * schema `scolarite`. Chaque lecture passe par l'API interne du
 * microservice Scolarite (`/interne/...` + `X-Internal-Secret`).
 *
 * Aucune donnee n'est dupliquee cote Vie scolaire : seules les cles
 * externes (apprenant_id, cours_id) sont conservees, et les uuid sont
 * resolus a la volee au moment de la serialisation.
 *
 * Les chemins ci-dessous constituent le contrat consomme. Ils doivent
 * etre alignes sur ceux exposes par le microservice Scolarite ; toute
 * evolution se fait des deux cotes dans la meme pull request.
 */
class ScolariteClient
{
    public function __construct(
        private readonly InterneClient $interne,
    ) {}

    public function coursParUuid(int $tenantId, string $uuid): ?object
    {
        return $this->interne->get('scolarite', '/interne/emplois-du-temps', [
            'tenant_id' => $tenantId,
            'uuid' => $uuid,
        ]);
    }

    public function coursParId(int $tenantId, int $id): ?object
    {
        return $this->interne->get('scolarite', '/interne/emplois-du-temps', [
            'tenant_id' => $tenantId,
            'id' => $id,
        ]);
    }

    public function apprenantParUuid(int $tenantId, string $uuid): ?object
    {
        return $this->interne->get('scolarite', '/interne/apprenants', [
            'tenant_id' => $tenantId,
            'uuid' => $uuid,
        ]);
    }

    public function apprenantParId(int $tenantId, int $id): ?object
    {
        return $this->interne->get('scolarite', '/interne/apprenants', [
            'tenant_id' => $tenantId,
            'id' => $id,
        ]);
    }

    /**
     * @param  array<int>  $ids
     * @return array<int, object> indexe par identifiant
     */
    public function apprenantsParIds(int $tenantId, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $apprenants = $this->interne->get('scolarite', '/interne/apprenants', [
            'tenant_id' => $tenantId,
            'ids' => implode(',', $ids),
        ]) ?? [];

        $parId = [];
        foreach ($apprenants['apprenants'] ?? $apprenants as $apprenant) {
            $parId[(int) $apprenant->id] = $apprenant;
        }

        return $parId;
    }

    /**
     * Carte id => uuid des apprenants demandes.
     *
     * @param  array<int>  $ids
     * @return array<int, string>
     */
    public function uuidsPourApprenants(int $tenantId, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $apprenants = $this->interne->get('scolarite', '/interne/apprenants', [
            'tenant_id' => $tenantId,
            'ids' => implode(',', $ids),
        ]) ?? [];

        $uuids = [];
        foreach ($apprenants['apprenants'] ?? $apprenants as $apprenant) {
            $uuids[(int) $apprenant->id] = (string) $apprenant->uuid;
        }

        return $uuids;
    }

    /**
     * Identifiants numeriques des apprenants d'une classe (par son uuid).
     *
     * @return array<int>
     */
    public function apprenantIdsParClasseUuid(int $tenantId, string $classeUuid): array
    {
        $reponse = $this->interne->get('scolarite', '/interne/classes/apprenants', [
            'tenant_id' => $tenantId,
            'classe_uuid' => $classeUuid,
        ]);

        return array_map('intval', $reponse['apprenant_ids'] ?? []);
    }

    public function classeParUuid(int $tenantId, string $uuid): ?object
    {
        return $this->interne->get('scolarite', '/interne/classes', [
            'tenant_id' => $tenantId,
            'uuid' => $uuid,
        ]);
    }
}
