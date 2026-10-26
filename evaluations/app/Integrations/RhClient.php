<?php

namespace App\Integrations;

use App\Common\Tenant\Contexte;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Affectation enseignant ↔ matière ↔ classe (CDC §17.2) : la vérification de
 * sécurité la plus importante du module.
 *
 * Source de vérité : le microservice RH, seul propriétaire du schéma `rh`
 * (table `affectations`). Règle n°1 : aucune jointure SQL inter-schémas, donc
 * lecture par son API interne ; règle n°3 : en-tête `X-Internal-Secret`.
 *
 *   GET {RH_URL}/v1/interne/affectations/verifier  → data.affecte (booléen)
 *   GET {RH_URL}/v1/interne/affectations           → data (liste, toujours actif)
 *
 * Service ou contrat indisponible ⇒ exception ⇒ HTTP 503 : une note n'est
 * jamais saisie si l'affectation n'a pas pu être vérifiée (fail closed).
 * Le filtrage distant n'est jamais pris pour argent comptant : l'écho des
 * uuids renvoyé par RH est recontrôlé côté Évaluations.
 */
class RhClient
{
    public function estAffecte(string $enseignantUuid, string $matiereUuid, string $classeUuid): bool
    {
        $donnees = $this->interroger('/v1/interne/affectations/verifier', [
            'enseignant_uuid' => $enseignantUuid,
            'matiere_uuid' => $matiereUuid,
            'classe_uuid' => $classeUuid,
        ]);

        if (! is_array($donnees) || ! array_key_exists('affecte', $donnees)) {
            throw new ContratIncompletException('RH ne fournit pas `data.affecte` sur /interne/affectations/verifier.');
        }

        foreach (['enseignant_uuid' => $enseignantUuid, 'matiere_uuid' => $matiereUuid, 'classe_uuid' => $classeUuid] as $champ => $attendu) {
            if (! array_key_exists($champ, $donnees) || ! hash_equals((string) $donnees[$champ], $attendu)) {
                throw new ContratIncompletException("RH ne renvoie pas un écho cohérent de `{$champ}`.");
            }
        }

        return $donnees['affecte'] === true;
    }

    public function enseigneDansClasse(string $enseignantUuid, string $classeUuid): bool
    {
        $affectations = $this->interroger('/v1/interne/affectations', [
            'enseignant_uuid' => $enseignantUuid,
            'classe_uuid' => $classeUuid,
        ]);

        if (! is_array($affectations) || ! array_is_list($affectations)) {
            throw new ContratIncompletException('RH ne fournit pas `data` sous forme de liste sur /interne/affectations.');
        }

        foreach ($affectations as $a) {
            if (! is_array($a) || ! array_key_exists('enseignant_uuid', $a) || ! array_key_exists('classe_uuid', $a)) {
                throw new ContratIncompletException('RH ne fournit pas enseignant_uuid / classe_uuid dans ses affectations.');
            }

            if (($a['statut'] ?? 'actif') === 'actif'
                && hash_equals((string) $a['classe_uuid'], $classeUuid)
                && hash_equals((string) $a['enseignant_uuid'], $enseignantUuid)) {
                return true;
            }
        }

        return false;
    }

    /** @param  array<string, mixed>  $filtres  @return mixed valeur de `data` */
    private function interroger(string $chemin, array $filtres): mixed
    {
        $url = rtrim((string) config('services.rh.url'), '/');
        $secret = (string) config('services.interne.secret', '');

        try {
            $reponse = Http::withHeaders([
                (string) config('services.interne.header', 'X-Internal-Secret') => $secret,
                'X-Tenant-Id' => (string) Contexte::tenantId(),
                'Accept' => 'application/json',
            ])
                ->timeout((int) config('services.rh.timeout', 5))
                ->retry(2, 200, throw: false)
                ->get($url.$chemin, ['tenant_id' => (string) Contexte::tenantId()] + $filtres);
        } catch (ConnectionException $e) {
            throw new ServiceIndisponibleException('RH (affectations) injoignable.', previous: $e);
        }

        if (! $reponse->successful()) {
            throw new ServiceIndisponibleException('RH (affectations) a répondu HTTP '.$reponse->status().'.');
        }

        return $reponse->json('data');
    }
}
