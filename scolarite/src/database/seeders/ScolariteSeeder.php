<?php

namespace App\database\seeders;

use App\classes\Classe;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ScolariteSeeder extends Seeder
{
    public function run(): void
    {
        $tenantId = 1;

        // Classes de demonstration pour tester les deux programmes (beninois et francais)
        Classe::firstOrCreate(
            ['tenant_id' => $tenantId, 'nom' => '6eme A (Programme Beninois)'],
            [
                'uuid' => (string) Str::uuid(),
                'cycle' => 'secondaire',
                'niveau' => '6e',
                'programme' => 'beninois',
                'capacite' => 45,
                'statut' => 'actif',
            ]
        );

        Classe::firstOrCreate(
            ['tenant_id' => $tenantId, 'nom' => '6eme B (Programme Francais)'],
            [
                'uuid' => (string) Str::uuid(),
                'cycle' => 'secondaire',
                'niveau' => '6e',
                'programme' => 'francais',
                'capacite' => 30,
                'statut' => 'actif',
            ]
        );

        Classe::firstOrCreate(
            ['tenant_id' => $tenantId, 'nom' => 'CP (Programme Beninois)'],
            [
                'uuid' => (string) Str::uuid(),
                'cycle' => 'primaire',
                'niveau' => 'CP',
                'programme' => 'beninois',
                'capacite' => 40,
                'statut' => 'actif',
            ]
        );
    }
}
