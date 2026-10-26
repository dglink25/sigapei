<?php

namespace App\Integrations;

use App\Common\Tenant\Contexte;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Lecture des apprenants et des classes auprès de Scolarité (README plateforme, règle n°1 :
 * jamais de jointure SQL inter-schémas). Endpoint : GET {SCOLARITE_URL}/v1/interne/apprenants,
 * avec X-Internal-Secret et X-Tenant-Id (Scolarité applique son propre filtre tenant).
 *
 * Champs exploités dans la réponse (`donnees`) :
 *   uuid, statut, classe {uuid, cycle, niveau, programme}            - exposés aujourd'hui
 *   utilisateur_uuid, parents[].parent_uuid                          - CONTRAT DEMANDÉ À SCOLARITÉ
 * Tant qu'un champ demandé est absent, la vérification correspondante échoue (fail closed) :
 * on refuse plutôt que de deviner l'identité d'un apprenant ou d'un parent.
 *
 * Toute indisponibilité de Scolarité lève une exception (=> 503), jamais un accès accordé par défaut.
 */
class ScolariteClient
{
    /** @return array<string, mixed>|null null si l'apprenant n'existe pas pour ce tenant */
    public function apprenant(string $apprenantUuid): ?array
    {
        $donnees = $this->appeler(['uuid' => $apprenantUuid]);

        return is_array($donnees) && ($donnees['uuid'] ?? null) === $apprenantUuid ? $donnees : null;
    }

    /**
     * Apprenants actifs d'une classe, indexés par uuid.
     *
     * @return array<string, array<string, mixed>>
     */
    public function apprenantsDeClasse(string $classeUuid): array
    {
        $donnees = $this->appeler(['classe_uuid' => $classeUuid, 'statut' => 'actif']);

        if (! is_array($donnees) || ! array_is_list($donnees)) {
            throw new RuntimeException('Réponse Scolarité inattendue (liste des apprenants).');
        }
        if (count($donnees) >= 500) {
            // Scolarité plafonne à 500 résultats : au-delà, la liste serait tronquée en silence.
            throw new RuntimeException('Classe de 500 apprenants ou plus : pagination Scolarité requise.');
        }

        $parUuid = [];
        foreach ($donnees as $a) {
            if (($a['classe']['uuid'] ?? null) === $classeUuid && isset($a['uuid'])) {
                $parUuid[$a['uuid']] = $a;
            }
        }

        return $parUuid;
    }

    /** Classe d'un apprenant {uuid, cycle, niveau, programme}, ou null. */
    public function classeDe(string $apprenantUuid): ?array
    {
        $a = $this->apprenant($apprenantUuid);

        return isset($a['classe']['uuid']) ? $a['classe'] : null;
    }

    /** L'utilisateur connecté est-il l'apprenant lui-même ? (exige utilisateur_uuid) */
    public function estLApprenant(array $apprenant, string $utilisateurUuid): bool
    {
        if (! array_key_exists('utilisateur_uuid', $apprenant)) {
            throw new ContratIncompletException('Scolarité ne fournit pas encore utilisateur_uuid.');
        }

        return is_string($apprenant['utilisateur_uuid']) && hash_equals($apprenant['utilisateur_uuid'], $utilisateurUuid);
    }

    /** L'utilisateur connecté est-il un parent rattaché ? (exige parents[].parent_uuid) */
    public function estParentDe(array $apprenant, string $utilisateurUuid): bool
    {
        foreach ($apprenant['parents'] ?? [] as $p) {
            if (! array_key_exists('parent_uuid', $p)) {
                throw new ContratIncompletException('Scolarité ne fournit pas encore parents[].parent_uuid.');
            }
            if (is_string($p['parent_uuid']) && hash_equals($p['parent_uuid'], $utilisateurUuid)) {
                return true;
            }
        }

        return false;
    }

    private function appeler(array $query): mixed
    {
        $url = rtrim((string) config('services.scolarite.url'), '/');
        $secret = (string) config('services.interne.secret', '');

        if ($url === '' || $secret === '') {
            throw new RuntimeException('Configuration Scolarité incomplète (SCOLARITE_URL / INTERNAL_API_SECRET).');
        }

        try {
            $reponse = Http::withHeaders([
                (string) config('services.interne.header', 'X-Internal-Secret') => $secret,
                'X-Tenant-Id' => (string) Contexte::tenantId(),
                'Accept' => 'application/json',
            ])
                ->timeout((int) config('services.scolarite.timeout', 5))
                ->retry(2, 200, throw: false)
                ->get($url.'/v1/interne/apprenants', $query);
        } catch (ConnectionException $e) {
            throw new ServiceIndisponibleException('Scolarité injoignable.', previous: $e);
        }

        if (! $reponse->successful()) {
            throw new ServiceIndisponibleException('Scolarité a répondu HTTP '.$reponse->status().'.');
        }

        return $reponse->json('donnees', $reponse->json('data'));
    }
}
