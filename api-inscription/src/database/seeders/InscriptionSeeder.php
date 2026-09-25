<?php

namespace App\database\seeders;

use App\candidatures\Candidature;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class InscriptionSeeder extends Seeder
{
    public function run(): void
    {
        $tenantId = 1;

        // Candidature exemple
        Candidature::firstOrCreate(
            ['tenant_id' => $tenantId, 'email' => 'candidat.demo@sigapei.com'],
            [
                'uuid' => (string) Str::uuid(),
                'nom' => 'Koffi',
                'prenom' => 'Jean-Luc',
                'date_naissance' => '2012-05-14',
                'sexe' => 'M',
                'telephone' => '+22997000001',
                'classe_visee_id' => 1,
                'statut' => 'soumise',
                'date_soumission' => now(),
                'parent_nom' => 'Koffi',
                'parent_prenom' => 'Marc',
                'parent_telephone' => '+22997000002',
                'parent_email' => 'parent.koffi@sigapei.com',
                'parent_lien' => 'pere',
            ]
        );
    }
}
