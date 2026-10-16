<?php

namespace Database\Seeders;

use App\Common\Tenant\Contexte;
use App\Models\Grade;
use Illuminate\Database\Seeder;

/**
 * Référentiel de grades par défaut pour un établissement.
 *
 * Idempotent : rejouer le seeder ne crée pas de doublon (unicité tenant+code).
 * Le tenant est fourni par RH_SEED_TENANT_ID (aucune donnée n'est créée si absent).
 */
class DatabaseSeeder extends Seeder
{
    private const GRADES = [
        ['code' => 'PRF', 'libelle' => 'Professeur', 'categorie' => 'A'],
        ['code' => 'INST', 'libelle' => 'Instituteur', 'categorie' => 'B'],
        ['code' => 'ADM', 'libelle' => 'Administratif', 'categorie' => 'B'],
        ['code' => 'DIR', 'libelle' => 'Directeur', 'categorie' => 'A'],
        ['code' => 'SURV', 'libelle' => 'Surveillant', 'categorie' => 'C'],
    ];

    public function run(): void
    {
        $tenantId = (int) env('RH_SEED_TENANT_ID', 0);
        if ($tenantId < 1) {
            $this->command?->warn('RH_SEED_TENANT_ID absent : aucun grade créé.');

            return;
        }

        Contexte::executerPour($tenantId, function () {
            foreach (self::GRADES as $grade) {
                Grade::firstOrCreate(
                    ['code' => $grade['code']],
                    $grade + ['active' => true]
                );
            }
        });
    }
}
