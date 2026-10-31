<?php

namespace App\Integrations;

use App\Common\Tenant\Contexte;

/**
 * Microservice Paiement : seul responsable de l'argent réel (agrégateurs FedaPay/CinetPay, portefeuilles,
 * grand livre, reçus d'encaissement, décaissements). Finances ne parle jamais à un agrégateur : il demande
 * un encaissement pour une facture et lit son état.
 *
 * CONTRAT DEMANDÉ À PAIEMENT (routes internes, X-Internal-Secret, montants entiers en unités mineures) :
 *   POST /v1/interne/encaissements   en-tête Idempotency-Key ; corps {etablissement_uuid, devise, montant,
 *        objet_type: "facture", objet_uuid, libelle, payeur_utilisateur_uuid, url_retour}
 *        => {uuid, statut, url_paiement, expire_le}
 *   GET  /v1/interne/encaissements/{uuid}
 *        => {uuid, etablissement_uuid, objet_type, objet_uuid, devise, montant, montant_rembourse, statut, approuve_le}
 *   Notification de changement d'état : POST {FINANCES}/v1/interne/paiements/notification {encaissement_uuid}
 *   (ou événement RabbitMQ portant ce même uuid). Finances relit TOUJOURS l'encaissement avant d'agir.
 * Tant que ces routes n'existent pas, tout paiement en ligne répond 503 (jamais un paiement supposé).
 */
class PaiementClient
{
    /** États de Paiement qui valent encaissement acquis (machine « encaissement » du service Paiement). */
    public const ETATS_ACQUIS = ['approuve', 'disponible', 'rembourse_partiel', 'rembourse'];

    public const ETATS_CONNUS = ['initie', 'en_attente', 'approuve', 'refuse', 'annule', 'expire', 'disponible', 'rembourse_partiel', 'rembourse'];

    public function __construct(private readonly ClientInterne $http) {}

    /** @return array{uuid: string, statut: string, url_paiement: ?string, expire_le: ?string} */
    public function creerEncaissement(array $demande, string $cleIdempotence): array
    {
        $d = ClientInterne::charge($this->http->post('paiement', '/v1/interne/encaissements', $demande, Contexte::etablissement(), [
            'Idempotency-Key' => $cleIdempotence,
        ]));
        if (! is_array($d) || ! is_string($d['uuid'] ?? null) || ! in_array($d['statut'] ?? null, self::ETATS_CONNUS, true)) {
            throw new ContratIncompletException('Paiement : réponse de création d\'encaissement inattendue.');
        }

        return ['uuid' => $d['uuid'], 'statut' => $d['statut'], 'url_paiement' => $d['url_paiement'] ?? null, 'expire_le' => $d['expire_le'] ?? null];
    }

    /** Lecture de référence d'un encaissement (jamais d'action sur la seule foi d'une notification). */
    public function encaissement(string $uuid, string $etablissement): ?array
    {
        $d = ClientInterne::charge($this->http->get('paiement', '/v1/interne/encaissements/'.$uuid, [], $etablissement));
        if ($d === null) {
            return null;
        }
        foreach (['uuid', 'etablissement_uuid', 'objet_type', 'objet_uuid', 'montant', 'statut'] as $champ) {
            if (! array_key_exists($champ, $d)) {
                throw new ContratIncompletException("Paiement : champ `{$champ}` absent de l'encaissement.");
            }
        }
        if ($d['uuid'] !== $uuid || ! in_array($d['statut'], self::ETATS_CONNUS, true) || ! ctype_digit((string) $d['montant'])) {
            throw new ContratIncompletException('Paiement : encaissement incohérent.');
        }

        return $d;
    }
}
