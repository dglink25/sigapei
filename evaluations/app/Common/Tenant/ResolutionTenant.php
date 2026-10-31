<?php

namespace App\Common\Tenant;

use App\Integrations\EtablissementsClient;

/**
 * Référence d'établissement reçue (en-tête X-Tenant-Id, claim tenantId du jeton) -> tenant_id.
 *  - entier positif : identifiant tenant, utilisé tel quel (convention Gateway / services Laravel) ;
 *  - uuid           : uuid de l'établissement (Identité, front, E-learning), converti via Établissements ;
 *  - autre chose    : null (refus).
 */
class ResolutionTenant
{
    private const UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

    public function __construct(private readonly EtablissementsClient $etablissements) {}

    public function resoudre(?string $reference): ?int
    {
        $reference = trim((string) $reference);

        if ($reference !== '' && ctype_digit($reference) && strlen($reference) <= 18) {
            return (int) $reference >= 1 ? (int) $reference : null;
        }
        if (preg_match(self::UUID, $reference)) {
            return $this->etablissements->idDepuisUuid($reference);
        }

        return null;
    }
}
