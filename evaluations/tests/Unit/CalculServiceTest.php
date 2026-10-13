<?php

namespace Tests\Unit;

use App\Services\CalculService;
use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires du CalculService — guide tasks §2.5.
 * "100 % des règles de barème, y compris reproductibilité et identité
 *  des résultats web/PDF/API interne."
 *
 * NFR guide tasks §2.6 : bulletin individuel < 500 ms.
 */
class CalculServiceTest extends TestCase
{
    private CalculService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CalculService();
    }

    // =========================================================================
    // ARRONDI (requirements §5.4)
    // =========================================================================

    public function test_arrondi_demi_vers_haut(): void
    {
        $this->assertSame(13.5, $this->service->arrondir(13.3, 'demi'));
        $this->assertSame(14.0, $this->service->arrondir(13.8, 'demi'));
        $this->assertSame(13.5, $this->service->arrondir(13.5, 'demi'));
        $this->assertSame(0.0,  $this->service->arrondir(0.0,  'demi'));
        $this->assertSame(20.0, $this->service->arrondir(20.0, 'demi'));
    }

    public function test_arrondi_entier(): void
    {
        $this->assertSame(13.0, $this->service->arrondir(13.4, 'entier'));
        $this->assertSame(14.0, $this->service->arrondir(13.5, 'entier'));
        $this->assertSame(0.0,  $this->service->arrondir(0.0,  'entier'));
        $this->assertSame(20.0, $this->service->arrondir(20.0, 'entier'));
    }

    public function test_arrondi_deux_decimales(): void
    {
        $this->assertSame(13.33, $this->service->arrondir(13.333, 'deux_decimales'));
        $this->assertSame(13.34, $this->service->arrondir(13.336, 'deux_decimales'));
    }

    public function test_arrondi_valeur_inconnue_utilise_demi(): void
    {
        // Règle par défaut = demi
        $this->assertSame(13.5, $this->service->arrondir(13.3, 'inconnu'));
    }

    // =========================================================================
    // MENTION (requirements §5, §6.3 — jamais codée en dur)
    // =========================================================================

    private function echelleBeninoise(): array
    {
        return [
            ['min' => 18,   'max' => 20,    'mention' => 'Excellent'],
            ['min' => 16,   'max' => 17.99, 'mention' => 'Très Bien'],
            ['min' => 14,   'max' => 15.99, 'mention' => 'Bien'],
            ['min' => 12,   'max' => 13.99, 'mention' => 'Assez Bien'],
            ['min' => 10,   'max' => 11.99, 'mention' => 'Passable'],
            ['min' => 0,    'max' => 9.99,  'mention' => 'Insuffisant'],
        ];
    }

    public function test_mention_excellent(): void
    {
        $this->assertSame('Excellent',   $this->service->determinerMention(18.0,  $this->echelleBeninoise()));
        $this->assertSame('Excellent',   $this->service->determinerMention(20.0,  $this->echelleBeninoise()));
    }

    public function test_mention_passable(): void
    {
        $this->assertSame('Passable',    $this->service->determinerMention(10.0,  $this->echelleBeninoise()));
        $this->assertSame('Passable',    $this->service->determinerMention(11.99, $this->echelleBeninoise()));
    }

    public function test_mention_insuffisant(): void
    {
        $this->assertSame('Insuffisant', $this->service->determinerMention(9.99,  $this->echelleBeninoise()));
        $this->assertSame('Insuffisant', $this->service->determinerMention(0.0,   $this->echelleBeninoise()));
    }

    public function test_mention_null_si_hors_echelle(): void
    {
        $this->assertNull($this->service->determinerMention(25.0, $this->echelleBeninoise()));
        $this->assertNull($this->service->determinerMention(-1.0, $this->echelleBeninoise()));
    }

    public function test_mention_null_si_echelle_vide(): void
    {
        $this->assertNull($this->service->determinerMention(15.0, []));
    }

    // =========================================================================
    // MOYENNE PONDÉRÉE (requirements §5.1-5.9)
    // =========================================================================

    private function configBase(string $noteNonSaisie = 'exclure', string $arrondi = 'demi'): array
    {
        return ['note_non_saisie' => $noteNonSaisie, 'arrondi' => $arrondi];
    }

    /** Cas simple : une matière, un devoir, coef 1×1 */
    public function test_moyenne_simple_une_matiere(): void
    {
        $notes = [
            ['valeur' => 14.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => true],
        ];
        $this->assertSame(14.0, $this->service->calculerMoyenne($notes, $this->configBase()));
    }

    /** Deux matières, coefficients différents */
    public function test_moyenne_deux_matieres_coefficients(): void
    {
        // Math coef 4, Français coef 2 : (16×4 + 12×2) / (4+2) = (64+24)/6 = 14.67 → arrondi demi = 14.5
        $notes = [
            ['valeur' => 16.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 4.0, 'saisie' => true],
            ['valeur' => 12.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 2.0, 'saisie' => true],
        ];
        $this->assertSame(14.5, $this->service->calculerMoyenne($notes, $this->configBase('exclure', 'demi')));
    }

    /** Coefficient évaluation ET matière (formule complète) */
    public function test_moyenne_coef_evaluation_et_matiere(): void
    {
        // Note 18, coef_eval=2, coef_mat=3 — seule note → moyenne = 18
        $notes = [
            ['valeur' => 18.0, 'coef_evaluation' => 2.0, 'coef_matiere' => 3.0, 'saisie' => true],
        ];
        $this->assertSame(18.0, $this->service->calculerMoyenne($notes, $this->configBase()));
    }

    /** Note non saisie → exclure (requirements §5.5) */
    public function test_note_non_saisie_exclure(): void
    {
        $notes = [
            ['valeur' => 16.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => true],
            ['valeur' => 0.0,  'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => false],
        ];
        // Seule la note saisie compte → 16.0
        $this->assertSame(16.0, $this->service->calculerMoyenne($notes, $this->configBase('exclure')));
    }

    /** Note non saisie → compter comme 0 (requirements §5.5) */
    public function test_note_non_saisie_zero(): void
    {
        $notes = [
            ['valeur' => 16.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => true],
            ['valeur' => 0.0,  'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => false],
        ];
        // (16×1 + 0×1) / 2 = 8.0
        $this->assertSame(8.0, $this->service->calculerMoyenne($notes, $this->configBase('zero')));
    }

    /** Aucune note applicable → null */
    public function test_moyenne_null_si_aucune_note(): void
    {
        $this->assertNull($this->service->calculerMoyenne([], $this->configBase()));
    }

    /** Aucune note saisie + politique exclure → null */
    public function test_moyenne_null_si_toutes_non_saisies_et_exclure(): void
    {
        $notes = [
            ['valeur' => 0.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => false],
        ];
        $this->assertNull($this->service->calculerMoyenne($notes, $this->configBase('exclure')));
    }

    /** Reproductibilité : même résultat appelé deux fois (requirements §5.2, §5.3) */
    public function test_reproductibilite_meme_resultat_appels_multiples(): void
    {
        $notes = [
            ['valeur' => 15.0, 'coef_evaluation' => 2.0, 'coef_matiere' => 3.0, 'saisie' => true],
            ['valeur' => 11.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 2.0, 'saisie' => true],
        ];
        $config   = $this->configBase('exclure', 'deux_decimales');
        $premier  = $this->service->calculerMoyenne($notes, $config);
        $deuxieme = $this->service->calculerMoyenne($notes, $config);
        $this->assertSame($premier, $deuxieme);
    }

    /** Composition en ligne : mêmes règles qu'une note manuelle (requirements §5.9) */
    public function test_composition_en_ligne_memes_regles(): void
    {
        $noteManuelle = [
            ['valeur' => 14.0, 'coef_evaluation' => 2.0, 'coef_matiere' => 3.0, 'saisie' => true],
        ];
        $noteComposition = [
            ['valeur' => 14.0, 'coef_evaluation' => 2.0, 'coef_matiere' => 3.0, 'saisie' => true],
        ];
        $config = $this->configBase();
        $this->assertSame(
            $this->service->calculerMoyenne($noteManuelle, $config),
            $this->service->calculerMoyenne($noteComposition, $config)
        );
    }

    // =========================================================================
    // RANGS (requirements §8)
    // =========================================================================

    public function test_rangs_ordre_decroissant(): void
    {
        $moyennes = ['a' => 16.0, 'b' => 12.0, 'c' => 18.0];
        $rangs    = $this->service->calculerRangs($moyennes, ['classement_active' => true]);

        $this->assertSame(2, $rangs['a']);
        $this->assertSame(3, $rangs['b']);
        $this->assertSame(1, $rangs['c']);
    }

    public function test_rangs_null_si_classement_desactive(): void
    {
        // Requirements §8.4 : classement désactivable
        $moyennes = ['a' => 16.0, 'b' => 12.0];
        $rangs    = $this->service->calculerRangs($moyennes, ['classement_active' => false]);

        $this->assertNull($rangs['a']);
        $this->assertNull($rangs['b']);
    }

    public function test_rangs_null_si_moyenne_null(): void
    {
        $moyennes = ['a' => 16.0, 'b' => null];
        $rangs    = $this->service->calculerRangs($moyennes, ['classement_active' => true]);

        $this->assertSame(1, $rangs['a']);
        $this->assertNull($rangs['b']);
    }

    // =========================================================================
    // STATISTIQUES DE CLASSE (requirements §8.2, §8.3)
    // =========================================================================

    public function test_statistiques_classe_moyenne_et_distribution(): void
    {
        $notesByApprenant = [
            'ap1' => [
                ['matiere_uuid' => 'mat1', 'valeur' => 16.0, 'saisie' => true, 'coef_evaluation' => 1, 'coef_matiere' => 1],
            ],
            'ap2' => [
                ['matiere_uuid' => 'mat1', 'valeur' => 12.0, 'saisie' => true, 'coef_evaluation' => 1, 'coef_matiere' => 1],
            ],
        ];

        $stats = $this->service->calculerStatistiquesClasse($notesByApprenant, $this->configBase());

        $this->assertSame(14.0, $stats['moyenne_classe']);
        $this->assertSame(2,    $stats['nb_apprenants']);
        $this->assertSame(12.0, $stats['par_matiere']['mat1']['min']);
        $this->assertSame(16.0, $stats['par_matiere']['mat1']['max']);
        $this->assertSame(14.0, $stats['par_matiere']['mat1']['moyenne']);
    }

    // =========================================================================
    // VALIDATION GRILLE (requirements §6.4-6.6)
    // =========================================================================

    public function test_validation_note_dans_grille_valide(): void
    {
        $this->expectNotToPerformAssertions();
        $this->service->validerNoteDansGrille(15.0, ['note_min' => 0, 'note_max' => 20]);
    }

    public function test_validation_note_hors_grille_leve_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->service->validerNoteDansGrille(25.0, ['note_min' => 0, 'note_max' => 20]);
    }

    public function test_validation_note_negative_leve_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->service->validerNoteDansGrille(-1.0, ['note_min' => 0, 'note_max' => 20]);
    }

    // =========================================================================
    // RÉSUMÉ BULLETIN (requirements §5.2 — identité web/PDF/API interne)
    // =========================================================================

    public function test_resume_bulletin_identique_peu_importe_le_contexte(): void
    {
        $notes  = [
            ['valeur' => 16.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 2.0, 'saisie' => true],
            ['valeur' => 12.0, 'coef_evaluation' => 1.0, 'coef_matiere' => 1.0, 'saisie' => true],
        ];
        $config  = $this->configBase('exclure', 'demi');
        $echelle = $this->echelleBeninoise();

        // Simuler appel depuis l'API web, puis depuis le PDF, puis depuis l'endpoint interne
        $resumeWeb    = $this->service->calculerResumeBulletin($notes, $config, $echelle);
        $resumePdf    = $this->service->calculerResumeBulletin($notes, $config, $echelle);
        $resumeIntern = $this->service->calculerResumeBulletin($notes, $config, $echelle);

        $this->assertSame($resumeWeb['moyenne'],  $resumePdf['moyenne']);
        $this->assertSame($resumeWeb['moyenne'],  $resumeIntern['moyenne']);
        $this->assertSame($resumeWeb['mention'],  $resumePdf['mention']);
        $this->assertSame($resumeWeb['mention'],  $resumeIntern['mention']);
    }

    public function test_resume_bulletin_affiche_politique_note_manquante(): void
    {
        $notes  = [];
        $config  = $this->configBase('zero');
        $echelle = $this->echelleBeninoise();

        $resume = $this->service->calculerResumeBulletin($notes, $config, $echelle);
        $this->assertStringContainsString('0', $resume['politique_note_manquante']);
    }

    // =========================================================================
    // PERFORMANCE (requirements §5.8, guide NFR §2.6 : < 500 ms)
    // =========================================================================

    public function test_calcul_bulletin_individuel_inferieur_500ms(): void
    {
        // 30 évaluations — cas réaliste d'un trimestre secondaire
        $notes = [];
        for ($i = 0; $i < 30; $i++) {
            $notes[] = [
                'valeur'          => mt_rand(0, 200) / 10,
                'coef_evaluation' => mt_rand(1, 3),
                'coef_matiere'    => mt_rand(1, 5),
                'saisie'          => true,
            ];
        }
        $config  = $this->configBase('exclure', 'demi');
        $echelle = $this->echelleBeninoise();

        $debut = microtime(true);
        $this->service->calculerResumeBulletin($notes, $config, $echelle);
        $dureeMs = (microtime(true) - $debut) * 1000;

        $this->assertLessThan(500, $dureeMs, "Calcul bulletin dépassé : {$dureeMs}ms (seuil : 500ms)");
    }
}
