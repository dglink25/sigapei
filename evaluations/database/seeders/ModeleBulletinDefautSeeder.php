<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Modèle de bulletin par défaut — guide requirements §10.4 + tasks §1.4.
 * "Un modèle par défaut, sobre et académique, DOIT être fourni nativement
 *  à tout nouvel établissement n'ayant pas configuré le sien."
 *
 * tenant_id = '__defaut__' : modèle système, copié pour chaque nouveau tenant.
 */
class ModeleBulletinDefautSeeder extends Seeder
{
    public function run(): void
    {
        $cycles = ['primaire', 'secondaire', 'universitaire'];

        foreach ($cycles as $cycle) {
            DB::table('evaluations.modele_bulletin')->updateOrInsert(
                [
                    'tenant_id' => '__defaut__',
                    'cycle'     => $cycle,
                ],
                [
                    'uuid'   => Str::uuid(),
                    'en_tete' => json_encode([
                        'logo'              => null,
                        'nom_etablissement' => '{{NOM_ETABLISSEMENT}}',
                        'ville'             => '{{VILLE}}',
                        'annee_scolaire'    => '{{ANNEE_SCOLAIRE}}',
                    ]),
                    'colonnes_affichees' => json_encode([
                        'matiere', 'coefficient', 'note', 'moyenne_classe', 'appreciation',
                    ]),
                    'echelle_appreciation' => json_encode([
                        ['min' => 16, 'max' => 20,   'mention' => 'Très Bien'],
                        ['min' => 14, 'max' => 15.99, 'mention' => 'Bien'],
                        ['min' => 12, 'max' => 13.99, 'mention' => 'Assez Bien'],
                        ['min' => 10, 'max' => 11.99, 'mention' => 'Passable'],
                        ['min' => 0,  'max' => 9.99,  'mention' => 'Insuffisant'],
                    ]),
                    'arrondi'              => 'demi',
                    'mentions_bas_de_page' => 'Document officiel — Ne pas modifier.',
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]
            );
        }
    }
}
