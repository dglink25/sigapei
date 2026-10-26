<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Bibliothèque de barèmes de la plateforme (tenant_id NULL), CDC §4.2. Idempotent (clé : code).
 * Chaque établissement en choisit un par cycle (PUT /v1/parametres-notation/{cycle}) ou crée le sien.
 */
class GrilleEvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $grilles = [
            [
                'code' => 'beninois_secondaire', 'nom' => 'Programme béninois - Secondaire (sur 20)',
                'cycle' => 'secondaire', 'programme' => 'beninois', 'type_notation' => 'chiffree',
                'note_min' => 0, 'note_max' => 20, 'avec_coefficients' => true, 'avec_classement' => true,
                'niveaux_competence' => null,
                'description' => 'Notation chiffrée sur 20, coefficients par matière, moyenne pondérée et classement.',
            ],
            [
                'code' => 'francais_secondaire', 'nom' => 'Programme français - Secondaire (sur 20)',
                'cycle' => 'secondaire', 'programme' => 'francais', 'type_notation' => 'chiffree',
                'note_min' => 0, 'note_max' => 20, 'avec_coefficients' => true, 'avec_classement' => true,
                'niveaux_competence' => null,
                'description' => 'Notation sur 20 ; le classement peut être désactivé par l\'établissement.',
            ],
            [
                'code' => 'beninois_primaire', 'nom' => 'Programme béninois - Primaire (sur 20)',
                'cycle' => 'primaire', 'programme' => 'beninois', 'type_notation' => 'chiffree',
                'note_min' => 0, 'note_max' => 20, 'avec_coefficients' => true, 'avec_classement' => true,
                'niveaux_competence' => null,
                'description' => 'Notation chiffrée sur 20 pour le primaire.',
            ],
            [
                'code' => 'competences_primaire', 'nom' => 'Compétences - Primaire (sans note chiffrée)',
                'cycle' => 'primaire', 'programme' => 'autre', 'type_notation' => 'competences',
                'note_min' => 0, 'note_max' => 20, 'avec_coefficients' => false, 'avec_classement' => false,
                'niveaux_competence' => json_encode([
                    ['code' => 'A', 'libelle' => 'Acquis'],
                    ['code' => 'EC', 'libelle' => 'En cours d\'acquisition'],
                    ['code' => 'NA', 'libelle' => 'Non acquis'],
                ], JSON_UNESCAPED_UNICODE),
                'description' => 'Livret de compétences : niveaux d\'acquisition, ni moyenne ni rang.',
            ],
            [
                'code' => 'universitaire_lmd', 'nom' => 'Universitaire - LMD (sur 20)',
                'cycle' => 'universitaire', 'programme' => 'autre', 'type_notation' => 'chiffree',
                'note_min' => 0, 'note_max' => 20, 'avec_coefficients' => true, 'avec_classement' => false,
                'niveaux_competence' => null,
                'description' => 'Notation sur 20 ; crédits ECTS et compensation : évolutions prévues.',
            ],
        ];

        foreach ($grilles as $g) {
            $existe = DB::table('grilles_evaluation')->whereNull('tenant_id')->where('code', $g['code'])->exists();

            if ($existe) {
                DB::table('grilles_evaluation')->whereNull('tenant_id')->where('code', $g['code'])
                    ->update($g + ['updated_at' => now()]);
            } else {
                DB::table('grilles_evaluation')->insert($g + ['tenant_id' => null, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }
}
