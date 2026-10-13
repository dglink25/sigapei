<?php

namespace App\Services;

/**
 * Rendu PDF d'un bulletin à partir du modèle de l'établissement.
 *
 * Guide suprême design §2.3 + §04 §1 :
 * - Charge modele_bulletin (tenant + cycle) ou le modèle par défaut.
 * - Produit le PDF, stocke dans documents (uuid), ne calcule RIEN.
 * - URL signée et expirante pour le téléchargement.
 */
class TemplateService
{
    /**
     * Génère le PDF d'un bulletin et le stocke dans le schéma documents.
     * Appelé de façon asynchrone par le job GenererBulletinPdf.
     * Guide tasks §4.2, §5.2 — Exigence 11.
     *
     * @param array  $bulletinData   données calculées du bulletin
     * @param string $tenantId
     * @param string $cycle
     * @return string  uuid du document créé dans le schéma documents
     */
    public function genererPdf(array $bulletinData, string $tenantId, string $cycle): string
    {
        // TODO : charger modele_bulletin, appliquer template, stocker dans documents
        throw new \RuntimeException('Non implémenté.');
    }

    /**
     * Génère une URL signée et expirante pour le téléchargement du PDF.
     * Guide §04 §1 point 10.
     *
     * @param string $documentUuid
     * @return string
     */
    public function genererUrlSignee(string $documentUuid): string
    {
        // TODO : générer URL signée S3/MinIO avec TTL
        throw new \RuntimeException('Non implémenté.');
    }
}
