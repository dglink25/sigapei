<?php

namespace Tests\Unit;

use App\Models\ParametresNotation;
use App\Services\CalculService;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

/**
 * Moteur de calcul - priorité absolue (CDC §21 : 100 % des règles de barème).
 */
class CalculServiceTest extends TestCase
{
    private CalculService $calcul;

    private const ECHELLE = [
        ['min' => '0', 'max' => '10', 'mention' => 'Insuffisant'],
        ['min' => '10', 'max' => '12', 'mention' => 'Passable'],
        ['min' => '12', 'max' => '14', 'mention' => 'Assez bien'],
        ['min' => '14', 'max' => '16', 'mention' => 'Bien'],
        ['min' => '16', 'max' => '20', 'mention' => 'Très bien'],
    ];

    protected function setUp(): void
    {
        $this->calcul = new CalculService;
    }

    private function regles(array $surcharge = []): array
    {
        return array_merge([
            'ponderation_types' => ParametresNotation::PONDERATION_DEFAUT,
            'decimales' => 2,
            'note_non_saisie' => 'exclure',
            'absence_non_justifiee' => 'zero',
            'regle_rattrapage' => 'meilleure',
            'type_notation' => 'chiffree',
            'note_min' => '0',
            'note_max' => '20',
            'echelle_appreciation' => self::ECHELLE,
            'classement_actif' => true,
        ], $surcharge);
    }

    private function ev(string $id, string $matiere, ?string $valeur, array $opts = []): array
    {
        $statut = $opts['statut'] ?? 'saisie';

        return [
            'evaluation_uuid' => $id,
            'type' => $opts['type'] ?? 'devoir_surveille',
            'matiere_uuid' => $matiere,
            'matiere_nom' => strtoupper($matiere),
            'coef_matiere' => $opts['coef_matiere'] ?? '1',
            'coef_evaluation' => $opts['coef_evaluation'] ?? '1',
            'note_sur' => $opts['note_sur'] ?? '20',
            'rattrapage_de' => $opts['rattrapage_de'] ?? null,
            'note' => ($opts['sans_note'] ?? false) ? null : [
                'statut' => $statut,
                'valeur' => $statut === 'saisie' ? $valeur : null,
            ],
        ];
    }

    // ---------------------------------------------------------------- Moyennes

    public function test_moyenne_par_matiere_puis_coefficients(): void
    {
        // Maths (coef 4) : 12 et 16 -> 14 ; Français (coef 2) : 11 -> (14×4 + 11×2) / 6 = 13
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', '12', ['coef_matiere' => '4']),
            $this->ev('e2', 'maths', '16', ['coef_matiere' => '4']),
            $this->ev('e3', 'fr', '11', ['coef_matiere' => '2']),
        ], $this->regles());

        $this->assertSame('13.00', $r['moyenne']);
        $this->assertSame('14.00', $r['matieres'][0]['moyenne']);
        $this->assertSame('11.00', $r['matieres'][1]['moyenne']);
        $this->assertSame('4.00', $r['matieres'][0]['coefficient']);
        $this->assertSame('Assez bien', $r['mention']);
    }

    public function test_defaut_beninois_interrogations_en_un_bloc_puis_devoirs(): void
    {
        // Interros 12, 14, 16 -> MI = 14 ; devoirs 10 et 13 -> (14 + 10 + 13) / 3 = 12,33
        $r = $this->calcul->calculerBulletin([
            $this->ev('i1', 'maths', '12', ['type' => 'interrogation']),
            $this->ev('i2', 'maths', '14', ['type' => 'interrogation']),
            $this->ev('i3', 'maths', '16', ['type' => 'interrogation']),
            $this->ev('d1', 'maths', '10'),
            $this->ev('d2', 'maths', '13'),
        ], $this->regles());

        $this->assertSame('12.33', $r['moyenne']);
        $this->assertSame(['interrogation' => '14.00'], $r['matieres'][0]['moyennes_blocs']);
    }

    public function test_le_nombre_d_interrogations_ne_change_pas_leur_poids(): void
    {
        // 5 interros à 20 pèsent autant qu'une seule : (20 + 10) / 2 = 15
        $evs = [$this->ev('d1', 'maths', '10')];
        for ($i = 0; $i < 5; $i++) {
            $evs[] = $this->ev("i{$i}", 'maths', '20', ['type' => 'interrogation']);
        }

        $this->assertSame('15.00', $this->calcul->calculerBulletin($evs, $this->regles())['moyenne']);
    }

    public function test_ponderation_parametrable_par_etablissement(): void
    {
        $evs = [
            $this->ev('i1', 'maths', '12', ['type' => 'interrogation']),
            $this->ev('d1', 'maths', '10'),
            $this->ev('c1', 'maths', '16', ['type' => 'composition']),
        ];

        // Défaut : (12 + 10 + 16) / 3 = 12,67
        $this->assertSame('12.67', $this->calcul->calculerBulletin($evs, $this->regles())['moyenne']);

        // Composition coefficient 2 : (12 + 10 + 16×2) / 4 = 13,50
        $ponderation = ParametresNotation::PONDERATION_DEFAUT;
        $ponderation['composition']['poids'] = '2';
        $this->assertSame('13.50', $this->calcul->calculerBulletin($evs, $this->regles(['ponderation_types' => $ponderation]))['moyenne']);

        // Interrogations comptées une par une : identique ici (une seule interro)
        $ponderation = ParametresNotation::PONDERATION_DEFAUT;
        $ponderation['interrogation']['mode'] = 'individuel';
        $this->assertSame('12.67', $this->calcul->calculerBulletin($evs, $this->regles(['ponderation_types' => $ponderation]))['moyenne']);
    }

    public function test_ponderation_invalide_refusee(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->calculerBulletin([], $this->regles(['ponderation_types' => ['interrogation' => ['mode' => 'moyenne', 'poids' => '1']]]));
    }

    public function test_coefficient_d_evaluation(): void
    {
        // (10×1 + 16×2) / 3 = 14
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', '10'),
            $this->ev('e2', 'maths', '16', ['coef_evaluation' => '2']),
        ], $this->regles());

        $this->assertSame('14.00', $r['moyenne']);
    }

    public function test_coefficients_decimaux(): void
    {
        // (12×1,5 + 15×0,5) / 2 = 12,75
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', '12', ['coef_matiere' => '1.5']),
            $this->ev('e2', 'svt', '15', ['coef_matiere' => '0.5']),
        ], $this->regles());

        $this->assertSame('12.75', $r['moyenne']);
    }

    public function test_epreuve_notee_sur_un_autre_bareme_est_ramenee_sur_20(): void
    {
        // 7/10 -> 14/20 ; 30/40 -> 15/20 ; moyenne 14,5
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', '7', ['note_sur' => '10']),
            $this->ev('e2', 'maths', '30', ['note_sur' => '40']),
        ], $this->regles());

        $this->assertSame('14.50', $r['moyenne']);
        $this->assertSame('14.00', $r['matieres'][0]['notes'][0]['valeur_retenue']);
    }

    public function test_arrondi_deux_decimales_par_defaut_et_parametrable(): void
    {
        $evs = [
            $this->ev('e1', 'maths', '10'),
            $this->ev('e2', 'maths', '11'),
            $this->ev('e3', 'maths', '11'),
        ]; // 32/3 = 10,6666...

        $this->assertSame('10.67', $this->calcul->calculerBulletin($evs, $this->regles())['moyenne']);
        $this->assertSame('10.667', $this->calcul->calculerBulletin($evs, $this->regles(['decimales' => 3]))['moyenne']);
        $this->assertSame('10.7', $this->calcul->calculerBulletin($evs, $this->regles(['decimales' => 1]))['moyenne']);
        $this->assertSame('11', $this->calcul->calculerBulletin($evs, $this->regles(['decimales' => 0]))['moyenne']);
    }

    public function test_aucune_imprecision_flottante(): void
    {
        // En float, (0.1 + 0.2) × 10 donnerait 3.0000000000000004.
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', '0.1'),
            $this->ev('e2', 'maths', '0.2'),
        ], $this->regles(['decimales' => 3]));

        $this->assertSame('0.150', $r['moyenne']);
    }

    // ---------------------------------------------------------------- Notes manquantes, absences

    public function test_note_non_saisie_exclue_ou_comptee_zero(): void
    {
        $evs = [
            $this->ev('e1', 'maths', '14'),
            $this->ev('e2', 'maths', null, ['sans_note' => true]),
        ];

        $exclue = $this->calcul->calculerBulletin($evs, $this->regles());
        $this->assertSame('14.00', $exclue['moyenne']);
        $this->assertSame('Notes non saisies exclues du calcul', $exclue['regles_appliquees']['politique_note_manquante']);

        $zero = $this->calcul->calculerBulletin($evs, $this->regles(['note_non_saisie' => 'zero']));
        $this->assertSame('7.00', $zero['moyenne']);
        $this->assertSame('Notes non saisies comptées comme 0', $zero['regles_appliquees']['politique_note_manquante']);
    }

    public function test_absences_et_dispenses(): void
    {
        $evs = [
            $this->ev('e1', 'maths', '16'),
            $this->ev('e2', 'maths', null, ['statut' => 'absent_justifie']),
            $this->ev('e3', 'maths', null, ['statut' => 'dispense']),
            $this->ev('e4', 'maths', null, ['statut' => 'absent_non_justifie']),
        ];

        // Justifiée et dispense exclues ; non justifiée = 0 par défaut -> (16 + 0) / 2
        $this->assertSame('8.00', $this->calcul->calculerBulletin($evs, $this->regles())['moyenne']);
        // Non justifiée exclue -> 16
        $this->assertSame('16.00', $this->calcul->calculerBulletin($evs, $this->regles(['absence_non_justifiee' => 'exclure']))['moyenne']);
    }

    public function test_aucune_note_donne_moyenne_nulle(): void
    {
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', null, ['statut' => 'absent_justifie']),
        ], $this->regles());

        $this->assertNull($r['moyenne']);
        $this->assertNull($r['mention']);
        $this->assertNull($r['matieres'][0]['moyenne']);
    }

    public function test_matiere_sans_note_ne_pese_pas_dans_la_moyenne_generale(): void
    {
        $r = $this->calcul->calculerBulletin([
            $this->ev('e1', 'maths', '12', ['coef_matiere' => '4']),
            $this->ev('e2', 'fr', null, ['statut' => 'dispense', 'coef_matiere' => '3']),
        ], $this->regles());

        $this->assertSame('12.00', $r['moyenne']);
    }

    // ---------------------------------------------------------------- Rattrapage

    public function test_rattrapage_meilleure_remplacer_moyenne(): void
    {
        $evs = [
            $this->ev('exam', 'maths', '8'),
            $this->ev('ratt', 'maths', '12', ['rattrapage_de' => 'exam']),
        ];

        $this->assertSame('12.00', $this->calcul->calculerBulletin($evs, $this->regles())['moyenne']);
        $this->assertSame('12.00', $this->calcul->calculerBulletin($evs, $this->regles(['regle_rattrapage' => 'remplacer']))['moyenne']);
        $this->assertSame('10.00', $this->calcul->calculerBulletin($evs, $this->regles(['regle_rattrapage' => 'moyenne']))['moyenne']);

        $pire = [
            $this->ev('exam', 'maths', '8'),
            $this->ev('ratt', 'maths', '5', ['rattrapage_de' => 'exam']),
        ];
        $this->assertSame('8.00', $this->calcul->calculerBulletin($pire, $this->regles())['moyenne']);
        $this->assertSame('5.00', $this->calcul->calculerBulletin($pire, $this->regles(['regle_rattrapage' => 'remplacer']))['moyenne']);
    }

    public function test_rattrapage_non_passe_est_ignore(): void
    {
        $r = $this->calcul->calculerBulletin([
            $this->ev('exam', 'maths', '8'),
            $this->ev('ratt', 'maths', null, ['rattrapage_de' => 'exam', 'statut' => 'absent_non_justifie']),
        ], $this->regles(['regle_rattrapage' => 'remplacer']));

        $this->assertSame('8.00', $r['moyenne']);
    }

    public function test_rattrapage_apres_absence_justifiee(): void
    {
        $r = $this->calcul->calculerBulletin([
            $this->ev('exam', 'maths', null, ['statut' => 'absent_justifie']),
            $this->ev('ratt', 'maths', '13', ['rattrapage_de' => 'exam']),
        ], $this->regles(['regle_rattrapage' => 'moyenne']));

        $this->assertSame('13.00', $r['moyenne']);
    }

    // ---------------------------------------------------------------- Grille de compétences

    public function test_grille_competences_sans_moyenne_chiffree(): void
    {
        $ev = $this->ev('e1', 'lecture', null, ['sans_note' => true]);
        $ev['note'] = ['statut' => 'saisie', 'valeur' => null, 'niveau_competence' => 'A'];

        $r = $this->calcul->calculerBulletin([$ev], $this->regles(['type_notation' => 'competences']));

        $this->assertNull($r['moyenne']);
        $this->assertSame('A', $r['matieres'][0]['notes'][0]['niveau_competence']);
    }

    // ---------------------------------------------------------------- Rangs

    public function test_rangs_avec_ex_aequo(): void
    {
        $rangs = $this->calcul->calculerRangs([
            'a' => 150000, 'b' => 120000, 'c' => 150000, 'd' => 90000, 'e' => null,
        ], 2, true);

        $this->assertSame(['rang' => 1, 'ex_aequo' => true], $rangs['a']);
        $this->assertSame(['rang' => 1, 'ex_aequo' => true], $rangs['c']);
        $this->assertSame(['rang' => 3, 'ex_aequo' => false], $rangs['b']);
        $this->assertSame(['rang' => 4, 'ex_aequo' => false], $rangs['d']);
        $this->assertSame(['rang' => null, 'ex_aequo' => false], $rangs['e']);
    }

    public function test_rang_calcule_sur_la_moyenne_affichee(): void
    {
        // 12,344 et 12,341 s'affichent tous deux 12,34 : même rang.
        $rangs = $this->calcul->calculerRangs(['a' => 123440, 'b' => 123410], 2, true);
        $this->assertSame(1, $rangs['a']['rang']);
        $this->assertSame(1, $rangs['b']['rang']);
        $this->assertTrue($rangs['a']['ex_aequo']);

        // Avec 3 décimales, ils se départagent.
        $rangs = $this->calcul->calculerRangs(['a' => 123440, 'b' => 123410], 3, true);
        $this->assertSame(1, $rangs['a']['rang']);
        $this->assertSame(2, $rangs['b']['rang']);
    }

    public function test_classement_desactive(): void
    {
        $rangs = $this->calcul->calculerRangs(['a' => 150000, 'b' => 120000], 2, false);
        $this->assertNull($rangs['a']['rang']);
        $this->assertNull($rangs['b']['rang']);
    }

    // ---------------------------------------------------------------- Statistiques de classe

    public function test_statistiques_classe(): void
    {
        $b1 = $this->calcul->calculerBulletin([$this->ev('e1', 'maths', '10'), $this->ev('e2', 'fr', '14')], $this->regles());
        $b2 = $this->calcul->calculerBulletin([$this->ev('e1', 'maths', '16'), $this->ev('e2', 'fr', null, ['statut' => 'absent_justifie'])], $this->regles());

        $s = $this->calcul->statistiquesClasse([$b1, $b2], 2);

        $this->assertSame('14.00', $s['moyenne_classe']); // (12 + 16) / 2
        $this->assertSame(2, $s['effectif_classe']);
        $this->assertSame(['matiere_uuid' => 'maths', 'matiere_nom' => 'MATHS', 'effectif' => 2, 'min' => '10.00', 'max' => '16.00', 'moyenne' => '13.00'], $s['par_matiere'][0]);
        $this->assertSame(1, $s['par_matiere'][1]['effectif']);
    }

    // ---------------------------------------------------------------- Mentions

    public function test_mentions_bornes(): void
    {
        $this->assertSame('Insuffisant', $this->calcul->mention(99999, self::ECHELLE));   // 9,9999
        $this->assertSame('Passable', $this->calcul->mention(100000, self::ECHELLE));     // 10 pile
        $this->assertSame('Bien', $this->calcul->mention(159999, self::ECHELLE));
        $this->assertSame('Très bien', $this->calcul->mention(200000, self::ECHELLE));    // borne haute incluse
        $this->assertNull($this->calcul->mention(200001, self::ECHELLE));
    }

    public function test_echelle_valide(): void
    {
        $this->calcul->validerEchelle(self::ECHELLE, '0', '20');
        $this->addToAssertionCount(1);
    }

    public function test_echelle_avec_trou_refusee(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->validerEchelle([
            ['min' => '0', 'max' => '9.99', 'mention' => 'Insuffisant'],
            ['min' => '10', 'max' => '20', 'mention' => 'Admis'],
        ], '0', '20');
    }

    public function test_echelle_incomplete_refusee(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->validerEchelle([['min' => '0', 'max' => '18', 'mention' => 'X']], '0', '20');
    }

    public function test_echelle_sans_libelle_refusee(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->validerEchelle([['min' => '0', 'max' => '20', 'mention' => ' ']], '0', '20');
    }

    // ---------------------------------------------------------------- Contrôles

    public function test_valeur_hors_bareme_refusee(): void
    {
        $this->calcul->validerValeur('20', '20');
        $this->calcul->validerValeur('9.75', '10');
        $this->addToAssertionCount(2);

        foreach (['20.5', '-1', '12.345', 'abc', ''] as $invalide) {
            try {
                $this->calcul->validerValeur($invalide, '20');
                $this->fail("Valeur acceptée à tort : {$invalide}");
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_note_superieure_au_bareme_en_base_est_rejetee(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->calculerBulletin([$this->ev('e1', 'maths', '12', ['note_sur' => '10'])], $this->regles());
    }

    public function test_coefficient_invalide(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->calculerBulletin([$this->ev('e1', 'maths', '12', ['coef_matiere' => '0'])], $this->regles());
    }

    public function test_parametres_invalides(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->calcul->calculerBulletin([], $this->regles(['decimales' => 5]));
    }

    // ---------------------------------------------------------------- Reproductibilité et performance

    public function test_reproductible(): void
    {
        $evs = [
            $this->ev('e1', 'maths', '13.25', ['coef_matiere' => '3']),
            $this->ev('e2', 'pc', '9.5', ['coef_matiere' => '2', 'coef_evaluation' => '2']),
        ];

        $premier = $this->calcul->calculerBulletin($evs, $this->regles());
        for ($i = 0; $i < 50; $i++) {
            $this->assertSame($premier, $this->calcul->calculerBulletin($evs, $this->regles()));
        }
    }

    public function test_bulletin_individuel_sous_500_ms(): void
    {
        $evs = [];
        for ($m = 0; $m < 15; $m++) {
            for ($e = 0; $e < 10; $e++) {
                $evs[] = $this->ev("e{$m}-{$e}", "m{$m}", (string) (($m + $e) % 21), ['coef_matiere' => (string) ($m % 5 + 1)]);
            }
        }

        $debut = hrtime(true);
        $this->calcul->calculerBulletin($evs, $this->regles());
        $this->assertLessThan(500, (hrtime(true) - $debut) / 1e6);
    }
}
