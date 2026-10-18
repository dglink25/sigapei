<?php

namespace App\Integrations;

use App\Common\Tenant\Contexte;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Affectation enseignant ↔ matière ↔ classe (CDC §17.2) : la vérification de sécurité la plus
 * importante du module. Aucun microservice RH n'existe encore : la source retenue est l'emploi du
 * temps de Scolarité (un enseignant est affecté s'il a un créneau actif pour cette matière dans
 * cette classe), via GET {SCOLARITE_URL}/v1/interne/emplois-du-temps?classe_uuid=&enseignant_uuid=.
 *
 * CONTRAT DEMANDÉ À SCOLARITÉ : chaque créneau doit exposer enseignant_uuid et matiere_uuid
 * (uuid de la matière d'Évaluations), et accepter le filtre enseignant_uuid. Aujourd'hui seuls
 * enseignant_id / matiere_id (identifiants internes) sont renvoyés : la vérification échoue donc
 * (fail closed) et aucune note ne peut être saisie tant que le contrat n'est pas livré.
 * Quand le microservice RH existera, seule cette classe changera.
 */
class RhClient
{
    public function estAffecte(string $enseignantUuid, string $matiereUuid, string $classeUuid): bool
    {
        foreach ($this->creneaux($enseignantUuid, $classeUuid) as $c) {
            if (($c['statut'] ?? 'actif') === 'actif' && hash_equals((string) $c['matiere_uuid'], $matiereUuid)) {
                return true;
            }
        }

        return false;
    }

    public function enseigneDansClasse(string $enseignantUuid, string $classeUuid): bool
    {
        foreach ($this->creneaux($enseignantUuid, $classeUuid) as $c) {
            if (($c['statut'] ?? 'actif') === 'actif') {
                return true;
            }
        }

        return false;
    }

    /** @return list<array<string, mixed>> créneaux de CET enseignant dans CETTE classe */
    private function creneaux(string $enseignantUuid, string $classeUuid): array
    {
        $url = rtrim((string) config('services.scolarite.url'), '/');
        $secret = (string) config('services.interne.secret', '');

        try {
            $reponse = Http::withHeaders([
                (string) config('services.interne.header', 'X-Internal-Secret') => $secret,
                'X-Tenant-Id' => (string) Contexte::tenantId(),
                'Accept' => 'application/json',
            ])
                ->timeout((int) config('services.scolarite.timeout', 5))
                ->retry(2, 200, throw: false)
                ->get($url.'/v1/interne/emplois-du-temps', [
                    'classe_uuid' => $classeUuid,
                    'enseignant_uuid' => $enseignantUuid,
                ]);
        } catch (ConnectionException $e) {
            throw new ServiceIndisponibleException('Scolarité (emplois du temps) injoignable.', previous: $e);
        }

        if (! $reponse->successful()) {
            throw new ServiceIndisponibleException('Scolarité (emplois du temps) a répondu HTTP '.$reponse->status().'.');
        }

        $creneaux = $reponse->json('donnees', $reponse->json('data'));
        if (! is_array($creneaux) || ! array_is_list($creneaux)) {
            throw new ServiceIndisponibleException('Réponse Scolarité inattendue (emplois du temps).');
        }

        $retenus = [];
        foreach ($creneaux as $c) {
            if (! array_key_exists('enseignant_uuid', $c) || ! array_key_exists('matiere_uuid', $c)) {
                throw new ContratIncompletException('Scolarité ne fournit pas encore enseignant_uuid / matiere_uuid dans les emplois du temps.');
            }
            // Double contrôle côté Évaluations : on ne fait pas confiance au seul filtrage distant.
            if ($c['classe_uuid'] === $classeUuid && is_string($c['enseignant_uuid']) && hash_equals($c['enseignant_uuid'], $enseignantUuid)) {
                $retenus[] = $c;
            }
        }

        return $retenus;
    }
}
