<?php

namespace App\Integrations;

/**
 * Microservice Paiements (dossier `paiements/`, port 4010) : seul responsable de l'argent réel (agrégateurs
 * FedaPay/KkiaPay/CinetPay, portefeuilles, grand livre, décaissements). Finances ne parle jamais à un agrégateur :
 * il demande un encaissement pour une facture et relit son état.
 *
 * ROUTES CONSOMMÉES (montants entiers en unités mineures) :
 *   POST /v1/etablissements/{etablissement}/encaissements
 *        corps {agregateurCode, montant, devise, libelle, objetType: "facture", objetUuid, urlRetour}
 *        => {uuid, referenceMarchande, urlPaiement, statut}
 *   GET  /v1/etablissements/{etablissement}/encaissements/{uuid}
 *        => {uuid, etablissement_uuid, objet_type, objet_uuid, devise, montant, montant_rembourse, statut, approuve_le}
 * Paiements ne notifie pas encore Finances : l'état est relu à l'affichage du paiement et par la synchronisation
 * planifiée (`finances:synchroniser-paiements`). La route POST /v1/interne/paiements/notification reste prête.
 * Finances relit TOUJOURS l'encaissement avant d'agir.
 */
class PaiementClient
{
    /** Agrégateurs à redirection proposés aux familles (KkiaPay passe par un widget, non pris en charge ici). */
    public const AGREGATEURS = ['fedapay', 'cinetpay'];

    /** États de Paiements qui valent encaissement acquis. */
    public const ETATS_ACQUIS = ['approuve', 'disponible', 'rembourse_partiel', 'rembourse'];

    public const ETATS_CONNUS = ['initie', 'en_attente', 'approuve', 'refuse', 'annule', 'expire', 'disponible', 'rembourse_partiel', 'rembourse'];

    public function __construct(private readonly ClientInterne $http) {}

    /**
     * @param  array{agregateur: string, montant: int, devise: string, libelle: string, objet_uuid: string, url_retour: ?string}  $demande
     * @return array{uuid: string, statut: string, url_paiement: ?string, expire_le: ?string}
     */
    public function creerEncaissement(string $etablissement, array $demande, string $cleIdempotence): array
    {
        $corps = array_filter([
            'agregateurCode' => $demande['agregateur'],
            'montant' => $demande['montant'],
            'devise' => $demande['devise'],
            'libelle' => $demande['libelle'],
            'objetType' => 'facture',
            'objetUuid' => $demande['objet_uuid'],
            'urlRetour' => $demande['url_retour'],
        ], fn ($v) => $v !== null);

        $d = ClientInterne::charge($this->http->post('paiement', "/v1/etablissements/{$etablissement}/encaissements", $corps, $etablissement, [
            'Idempotency-Key' => $cleIdempotence,
        ], refusMetier: true));
        if (! is_array($d) || ! is_string($d['uuid'] ?? null) || ! in_array($d['statut'] ?? null, self::ETATS_CONNUS, true)) {
            throw new ContratIncompletException('Paiements : réponse de création d\'encaissement inattendue.');
        }

        return ['uuid' => $d['uuid'], 'statut' => $d['statut'], 'url_paiement' => $d['urlPaiement'] ?? $d['url_paiement'] ?? null, 'expire_le' => $d['expire_le'] ?? null];
    }

    /** Lecture de référence d'un encaissement (jamais d'action sur la seule foi d'une notification). */
    public function encaissement(string $uuid, string $etablissement): ?array
    {
        $d = ClientInterne::charge($this->http->get('paiement', "/v1/etablissements/{$etablissement}/encaissements/{$uuid}", [], $etablissement));
        if ($d === null) {
            return null;
        }
        foreach (['uuid', 'etablissement_uuid', 'objet_type', 'objet_uuid', 'montant', 'statut'] as $champ) {
            if (! array_key_exists($champ, $d)) {
                throw new ContratIncompletException("Paiements : champ `{$champ}` absent de l'encaissement.");
            }
        }
        if ($d['uuid'] !== $uuid || ! in_array($d['statut'], self::ETATS_CONNUS, true) || ! ctype_digit((string) $d['montant'])) {
            throw new ContratIncompletException('Paiements : encaissement incohérent.');
        }

        return $d;
    }
}
