<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Grilles d'évaluation prédéfinies — guide tasks §1.4 + requirements §6.1.
 * "Au minimum : béninoise secondaire sur 20 avec coefficients ; française."
 * Le super administrateur peut étendre la bibliothèque (DECISION-17).
 *
 * Ces grilles sont des références plateforme (tenant_id = null).
 * Chaque établissement en choisit une à la configuration.
 */
class GrilleEvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $grilles = [
            [
                'uuid'        => Str::uuid(),
                'code'        => 'beninoise_secondaire',
                'nom'         => 'Programme béninois — Secondaire',
                'cycle'       => 'secondaire',
                'note_max'    => 20,
                'note_min'    => 0,
                'avec_coefficients' => true,
                'avec_classement'   => true,
                'echelle_appreciation' => json_encode([
                    ['min' => 18, 'max' => 20,   'mention' => 'Excellent'],
                    ['min' => 16, 'max' => 17.99, 'mention' => 'Très Bien'],
                    ['min' => 14, 'max' => 15.99, 'mention' => 'Bien'],
                    ['min' => 12, 'max' => 13.99, 'mention' => 'Assez Bien'],
                    ['min' => 10, 'max' => 11.99, 'mention' => 'Passable'],
                    ['min' => 0,  'max' => 9.99,  'mention' => 'Insuffisant'],
                ]),
                'description' => 'Notation sur 20 avec coefficients par matière, classement activé. '
                               . 'Conforme au programme officiel béninois.',
            ],
            [
                'uuid'        => Str::uuid(),
                'code'        => 'beninoise_primaire',
                'nom'         => 'Programme béninois — Primaire',
                'cycle'       => 'primaire',
                'note_max'    => 10,
                'note_min'    => 0,
                'avec_coefficients' => false,
                'avec_classement'   => false,
                'echelle_appreciation' => json_encode([
                    ['min' => 8,  'max' => 10,  'mention' => 'Très Bien'],
                    ['min' => 6,  'max' => 7.99, 'mention' => 'Bien'],
                    ['min' => 5,  'max' => 5.99, 'mention' => 'Assez Bien'],
                    ['min' => 0,  'max' => 4.99, 'mention' => 'Insuffisant'],
                ]),
                'description' => 'Notation sur 10, classement optionnel. Programme béninois primaire.',
            ],
            [
                'uuid'        => Str::uuid(),
                'code'        => 'francaise_secondaire',
                'nom'         => 'Programme français — Secondaire',
                'cycle'       => 'secondaire',
                'note_max'    => 20,
                'note_min'    => 0,
                'avec_coefficients' => true,
                'avec_classement'   => true,
                'echelle_appreciation' => json_encode([
                    ['min' => 16, 'max' => 20,   'mention' => 'Très Bien'],
                    ['min' => 14, 'max' => 15.99, 'mention' => 'Bien'],
                    ['min' => 12, 'max' => 13.99, 'mention' => 'Assez Bien'],
                    ['min' => 10, 'max' => 11.99, 'mention' => 'Passable'],
                    ['min' => 0,  'max' => 9.99,  'mention' => 'Insuffisant'],
                ]),
                'description' => 'Notation sur 20 avec coefficients, programme français.',
            ],
            [
                'uuid'        => Str::uuid(),
                'code'        => 'universitaire',
                'nom'         => 'Cycle universitaire (ECTS)',
                'cycle'       => 'universitaire',
                'note_max'    => 20,
                'note_min'    => 0,
                'avec_coefficients' => true,
                'avec_classement'   => false,
                'echelle_appreciation' => json_encode([
                    ['min' => 16, 'max' => 20,   'mention' => 'Très Bien'],
                    ['min' => 14, 'max' => 15.99, 'mention' => 'Bien'],
                    ['min' => 12, 'max' => 13.99, 'mention' => 'Assez Bien'],
                    ['min' => 10, 'max' => 11.99, 'mention' => 'Passable'],
                    ['min' => 0,  'max' => 9.99,  'mention' => 'Ajourné'],
                ]),
                'description' => 'Système crédits/ECTS. Compensation entre matières. '
                               . 'Règles exactes de rattrapage : DECISION-13.',
            ],
        ];

        foreach ($grilles as $grille) {
            DB::table('evaluations.grilles_evaluation')->updateOrInsert(
                ['code' => $grille['code']],
                array_merge($grille, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
