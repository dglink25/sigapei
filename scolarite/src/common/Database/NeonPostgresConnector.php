<?php

namespace App\common\Database;

use Illuminate\Database\Connectors\PostgresConnector;

/**
 * Connecteur PostgreSQL personnalisé pour Neon.tech
 *
 * Le pooler Neon nécessite que l'ID d'endpoint soit passé dans les options du DSN
 * via `options='endpoint=<endpoint-id>'`. La libpq ancienne (XAMPP PHP 8.2) ne supporte
 * pas SNI et ne peut pas identifier l'endpoint automatiquement.
 *
 * Ce connecteur surcharge getDsn() pour ajouter l'option endpoint si DB_ENDPOINT est défini.
 */
class NeonPostgresConnector extends PostgresConnector
{
    /**
     * Crée le DSN pour la connexion PostgreSQL.
     *
     * @param array $config
     * @return string
     */
    protected function getDsn(array $config): string
    {
        $dsn = parent::getDsn($config);

        // Ajouter l'endpoint Neon si défini (nécessaire pour le pooler sans SNI)
        if (!empty($config['neon_endpoint'])) {
            $dsn .= ";options='endpoint=" . $config['neon_endpoint'] . "'";
        }

        return $dsn;
    }
}
