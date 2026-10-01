<?php

namespace App\common\Providers;

use App\common\Database\NeonPostgresConnector;
use Illuminate\Support\ServiceProvider;

/**
 * Service Provider pour la connexion Neon.tech PostgreSQL.
 *
 * Le pooler Neon nécessite que l'ID d'endpoint soit transmis dans le DSN PDO
 * via options='endpoint=<id>' quand libpq ne supporte pas SNI.
 *
 * Cette approche bind 'db.connector.pgsql' dans le container Laravel —
 * c'est le point d'entrée officiel documenté dans ConnectionFactory::createConnector().
 * Elle s'applique à TOUTES les connexions pgsql sans toucher au code vendor.
 */
class NeonServiceProvider extends ServiceProvider
{
    /**
     * Register des services.
     * Enregistrement dans register() (avant boot) pour être disponible dès la première connexion.
     */
    public function register(): void
    {
        $this->app->bind('db.connector.pgsql', function () {
            return new NeonPostgresConnector();
        });
    }

    /**
     * Bootstrap des services.
     */
    public function boot(): void
    {
        //
    }
}
