<?php

namespace App\Integrations;

use App\Common\Tenant\Contexte;

/**
 * Scolarité : dossiers des apprenants (GET /v1/interne/apprenants).
 * Contrat attendu : uuid, nom, prenom, matricule, statut, classe {uuid, nom, cycle, niveau},
 * utilisateur_uuid (compte de l'apprenant), parents[].parent_uuid ; filtres ?uuid=, ?classe_uuid=&statut=,
 * ?utilisateur_uuid=, ?parent_uuid=. Tout filtre distant est recontrôlé ici ; champ manquant => 503.
 */
class ScolariteClient
{
    public function __construct(private readonly ClientInterne $http) {}

    public function apprenant(string $uuid): ?array
    {
        $a = ClientInterne::charge($this->http->get('scolarite', '/v1/interne/apprenants', ['uuid' => $uuid], Contexte::etablissement()));

        return is_array($a) && ($a['uuid'] ?? null) === $uuid ? $a : null;
    }

    /** @return list<array<string, mixed>> apprenants actifs d'une classe */
    public function apprenantsDeClasse(string $classeUuid): array
    {
        $liste = ClientInterne::charge($this->http->get('scolarite', '/v1/interne/apprenants', ['classe_uuid' => $classeUuid, 'statut' => 'actif'], Contexte::etablissement()));
        if (! is_array($liste) || ! array_is_list($liste)) {
            throw new ContratIncompletException('Scolarité : liste des apprenants inattendue.');
        }
        if (count($liste) >= 500) {
            throw new ContratIncompletException('Classe de 500 apprenants ou plus : pagination Scolarité requise.');
        }

        return array_values(array_filter($liste, fn ($a) => is_array($a) && isset($a['uuid']) && ($a['classe']['uuid'] ?? null) === $classeUuid
            && ($a['statut'] ?? null) === 'actif'));
    }

    /** @return list<array<string, mixed>> l'apprenant lui-même ou les enfants rattachés à un parent */
    public function apprenantsDuCompte(string $utilisateurUuid, bool $parent): array
    {
        $d = ClientInterne::charge($this->http->get('scolarite', '/v1/interne/apprenants',
            [$parent ? 'parent_uuid' : 'utilisateur_uuid' => $utilisateurUuid], Contexte::etablissement()));
        if ($d === null) {
            return [];
        }
        $liste = is_array($d) && array_is_list($d) ? $d : [$d];

        return array_values(array_filter($liste, fn ($a) => is_array($a) && isset($a['uuid']) && $this->lien($a, $utilisateurUuid) !== null));
    }

    /** L'utilisateur est-il l'apprenant, ou un parent rattaché ? */
    public function lien(array $apprenant, string $utilisateurUuid): ?string
    {
        if (! array_key_exists('utilisateur_uuid', $apprenant)) {
            throw new ContratIncompletException('Scolarité ne fournit pas encore utilisateur_uuid.');
        }
        if (is_string($apprenant['utilisateur_uuid']) && hash_equals($apprenant['utilisateur_uuid'], $utilisateurUuid)) {
            return 'apprenant';
        }
        foreach ($apprenant['parents'] ?? [] as $p) {
            if (! is_array($p) || ! array_key_exists('parent_uuid', $p)) {
                throw new ContratIncompletException('Scolarité ne fournit pas encore parents[].parent_uuid.');
            }
            if (is_string($p['parent_uuid']) && hash_equals($p['parent_uuid'], $utilisateurUuid)) {
                return 'parent';
            }
        }

        return null;
    }
}
