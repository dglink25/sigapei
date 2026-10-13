<?php

namespace App\Integrations;

use Illuminate\Support\Facades\Http;

/**
 * Accès au microservice Scolarité — README plateforme, règle n°1 :
 * jamais de jointure SQL inter-schémas, uniquement l'endpoint interne de Scolarité
 * GET /v1/interne/apprenants/{uuid}/classe (secret partagé + X-Tenant-Id).
 *
 * Réponse documentée par Scolarité (donnees) : uuid, nom, prenom, statut, classe_nom, cycle, programme.
 * Le champ `classe_uuid` N'EXISTE PAS encore dans cette réponse.
 */
class ScolariteClient
{
    /**
     * Informations d'un apprenant, ou null s'il est introuvable pour ce tenant.
     *
     * @return array<string,mixed>|null
     *
     * @throws \RuntimeException si Scolarité est injoignable ou répond une erreur (fail closed)
     */
    public function informationsApprenant(string $apprenantUuid, string $tenantId): ?array
    {
        $url     = rtrim((string) config('services.scolarite.url'), '/');
        $secret  = (string) config('services.interne.secret', '');
        $header  = (string) config('services.interne.header', 'X-Internal-Secret');
        $timeout = (int) config('services.scolarite.timeout', 5);

        if ($url === '' || $secret === '') {
            throw new \RuntimeException('Configuration Scolarité incomplète (SCOLARITE_URL / INTERNAL_API_SECRET).');
        }

        $reponse = Http::withHeaders([
            $header       => $secret,
            'X-Tenant-Id' => $tenantId,
            'Accept'      => 'application/json',
        ])->timeout($timeout)->get($url . '/v1/interne/apprenants/' . rawurlencode($apprenantUuid) . '/classe');

        if ($reponse->status() === 404) {
            return null;
        }

        if (! $reponse->successful()) {
            throw new \RuntimeException('Scolarité a répondu HTTP ' . $reponse->status() . '.');
        }

        $donnees = $reponse->json('donnees');

        return is_array($donnees) ? $donnees : null;
    }

    /**
     * Vérifie qu'un apprenant appartient à une classe (requirements Exigence 1.3).
     *
     * Fail closed : tant que Scolarité ne renvoie pas `classe_uuid`, l'appartenance est
     * impossible à prouver (le nom d'une classe n'est pas unique) → on refuse plutôt que deviner.
     * TODO(DECISION-22) : demander à Scolarité d'ajouter `classe_uuid` à la réponse de l'endpoint interne.
     */
    public function apprenantAppartientClasse(string $apprenantUuid, string $classeUuid, string $tenantId): bool
    {
        $infos = $this->informationsApprenant($apprenantUuid, $tenantId);

        if ($infos === null) {
            return false;
        }

        if (! array_key_exists('classe_uuid', $infos)) {
            throw new \RuntimeException('TODO(DECISION-22) : Scolarité ne fournit pas classe_uuid, appartenance non vérifiable.');
        }

        return hash_equals((string) $infos['classe_uuid'], $classeUuid);
    }
}
