<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Les pays uniquement : departements, communes et arrondissements se chargent
        // avec `php artisan geo:geonames` (voir docs/referentiel-geographique.md).
        // BeninGeoSeeder reste disponible comme repli hors ligne, a lancer a la main.
        $this->call([
            PaysMondeSeeder::class,
        ]);
    }
}
