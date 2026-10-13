<?php

namespace App\Services;

use App\Support\Decimal;
use InvalidArgumentException;

/**
 * Moteur UNIQUE de calcul (CDC §3, §5, §7) : moyennes, rangs, mentions, statistiques.
 *
 * - Fonctions pures : aucune lecture en base, aucun effet de bord, aucune mise en forme.
 *   Le même appel produit le même résultat pour la web app, le PDF et l'API interne.
 * - Arithmétique entière exacte (App\Support\Decimal) : aucun float, donc aucun écart d'arrondi.
 * - Aucun barème, coefficient, arrondi ou mention codé en dur : tout vient de parametres_notation.
 * - Une note de composition en ligne suit exactement les mêmes règles qu'une note saisie.
 *
 * Paramètres attendus ($regles) :
 *   ponderation_types     [type => ['mode' => 'bloc'|'individuel', 'poids' => '1']]
 *                         bloc : toutes les notes de ce type forment UNE note (leur moyenne) ;
 *                         individuel : chaque note compte séparément. Type absent : individuel, poids 1.
 *   decimales             0..3
 *   note_non_saisie       exclure | zero
 *   absence_non_justifiee exclure | zero
 *   regle_rattrapage      remplacer | meilleure | moyenne
 *   type_notation         chiffree | competences
 *   note_min, note_max    bornes de la grille (chaînes décimales)
 *   echelle_appreciation  [['min' => '16', 'max' => '20', 'mention' => 'Très bien'], ...]
 *   classement_actif      bool
 */
final class CalculService
{
    public const STATUTS = ['saisie', 'absent_justifie', 'absent_non_justifie', 'dispense'];

    /**
     * Bulletin d'un apprenant pour une période.
     *
     * @param list<array{
     *   evaluation_uuid: string, matiere_uuid: string, matiere_nom: string,
     *   type: string, coef_matiere: string, coef_evaluation: string, note_sur: string,
     *   rattrapage_de: ?string,
     *   note: null|array{statut: string, valeur: ?string, niveau_competence?: ?string}
     * }> $evaluations Toutes les évaluations de la classe sur la période, avec la note de l'apprenant (ou null)
     * @param  array<string, mixed>  $regles
     * @return array{
     *   moyenne: ?string, mention: ?string, matieres: list<array<string, mixed>>,
     *   regles_appliquees: array<string, mixed>, _moyenne_echelle: ?int
     * }
     */
    public function calculerBulletin(array $evaluations, array $regles): array
    {
        $regles = $this->validerRegles($regles);
        $competences = $regles['type_notation'] === 'competences';

        $retenues = $competences ? [] : $this->notesRetenues($evaluations, $regles);

        // Regroupement par matière, dans l'ordre d'apparition (stable).
        $matieres = [];
        foreach ($evaluations as $ev) {
            $m = $ev['matiere_uuid'];
            $matieres[$m] ??= [
                'matiere_uuid' => $m,
                'matiere_nom' => $ev['matiere_nom'],
                'coefficient' => $this->coefCentiemes($ev['coef_matiere']),
                'notes' => [],
            ];

            $matieres[$m]['notes'][] = [
                'evaluation_uuid' => $ev['evaluation_uuid'],
                'statut' => $ev['note']['statut'] ?? 'non_saisie',
                'valeur' => $ev['note']['valeur'] ?? null,
                'niveau_competence' => $ev['note']['niveau_competence'] ?? null,
                'note_sur' => $ev['note_sur'],
                'retenue' => isset($retenues[$ev['evaluation_uuid']]),
                'valeur_retenue' => isset($retenues[$ev['evaluation_uuid']])
                    ? Decimal::versTexte($retenues[$ev['evaluation_uuid']]['valeur'], $regles['decimales'])
                    : null,
            ];
        }

        // 1) Moyenne de chaque matière (défaut béninois : (moyenne des interrogations + devoir 1 + devoir 2 ...) / nombre d'éléments).
        foreach ($matieres as $m => $ligne) {
            [$moyenne, $blocs] = $this->moyenneMatiere(
                array_filter($retenues, fn ($r) => $r['matiere_uuid'] === $m),
                $regles['ponderation_types'],
            );
            $matieres[$m]['_moyenne_echelle'] = $moyenne;
            $matieres[$m]['moyenne'] = $moyenne === null ? null : Decimal::versTexte($moyenne, $regles['decimales']);
            $matieres[$m]['moyennes_blocs'] = array_map(fn ($b) => Decimal::versTexte($b, $regles['decimales']), $blocs);
            $matieres[$m]['coefficient'] = Decimal::versTexte($ligne['coefficient'] * 100, 2);
        }

        // 2) Moyenne générale = Σ(moyenne matière × coef matière) / Σ(coef matière), matières ayant une moyenne.
        $moyenneGenerale = null;
        if (! $competences) {
            $num = 0;
            $den = 0;
            foreach ($matieres as $ligne) {
                if ($ligne['_moyenne_echelle'] === null) {
                    continue;
                }
                $coef = $this->coefCentiemes($ligne['coefficient']);
                $num += $ligne['_moyenne_echelle'] * $coef;
                $den += $coef;
            }
            $moyenneGenerale = $den > 0 ? Decimal::diviserArrondi($num, $den) : null;
        }

        $moyenneArrondie = $moyenneGenerale === null ? null : Decimal::arrondir($moyenneGenerale, $regles['decimales']);

        return [
            'moyenne' => $moyenneArrondie === null ? null : Decimal::versTexte($moyenneArrondie, $regles['decimales']),
            'mention' => $moyenneArrondie === null ? null : $this->mention($moyenneArrondie, $regles['echelle_appreciation']),
            'matieres' => array_values($matieres),
            'regles_appliquees' => $this->reglesAffichees($regles),
            '_moyenne_echelle' => $moyenneGenerale,
        ];
    }

    /**
     * Rangs d'une classe (CDC §7), calculés sur la moyenne ARRONDIE affichée au bulletin :
     * deux moyennes affichées identiques ont le même rang, le suivant est décalé (1, 2, 2, 4).
     *
     * @param  array<string, ?int>  $moyennesEchelle  apprenant_uuid => moyenne à l'échelle 10^4 (non arrondie) ou null
     * @return array<string, array{rang: ?int, ex_aequo: bool}>
     */
    public function calculerRangs(array $moyennesEchelle, int $decimales, bool $classementActif): array
    {
        $resultat = [];
        foreach ($moyennesEchelle as $uuid => $m) {
            $resultat[$uuid] = ['rang' => null, 'ex_aequo' => false];
        }

        if (! $classementActif) {
            return $resultat;
        }

        $arrondies = [];
        foreach ($moyennesEchelle as $uuid => $m) {
            if ($m !== null) {
                $arrondies[$uuid] = Decimal::arrondir($m, $decimales);
            }
        }

        $frequences = array_count_values($arrondies);
        foreach ($arrondies as $uuid => $valeur) {
            $meilleurs = 0;
            foreach ($arrondies as $autre) {
                if ($autre > $valeur) {
                    $meilleurs++;
                }
            }
            $resultat[$uuid] = ['rang' => $meilleurs + 1, 'ex_aequo' => $frequences[$valeur] > 1];
        }

        return $resultat;
    }

    /**
     * Statistiques de classe (CDC §7) : moyenne de classe et distribution par matière.
     *
     * @param  list<array{_moyenne_echelle: ?int, matieres: list<array<string, mixed>>}>  $bulletins
     * @return array{moyenne_classe: ?string, effectif_classe: int, par_matiere: list<array<string, mixed>>, _moyenne_classe_echelle: ?int}
     */
    public function statistiquesClasse(array $bulletins, int $decimales): array
    {
        $generales = array_values(array_filter(array_column($bulletins, '_moyenne_echelle'), fn ($m) => $m !== null));
        $moyenneClasse = $generales === [] ? null : Decimal::diviserArrondi(array_sum($generales), count($generales));

        $parMatiere = [];
        foreach ($bulletins as $b) {
            foreach ($b['matieres'] as $ligne) {
                $parMatiere[$ligne['matiere_uuid']] ??= ['matiere_uuid' => $ligne['matiere_uuid'], 'matiere_nom' => $ligne['matiere_nom'], 'valeurs' => []];
                if ($ligne['_moyenne_echelle'] !== null) {
                    $parMatiere[$ligne['matiere_uuid']]['valeurs'][] = $ligne['_moyenne_echelle'];
                }
            }
        }

        $distribution = [];
        foreach ($parMatiere as $m) {
            $v = $m['valeurs'];
            $distribution[] = [
                'matiere_uuid' => $m['matiere_uuid'],
                'matiere_nom' => $m['matiere_nom'],
                'effectif' => count($v),
                'min' => $v === [] ? null : Decimal::versTexte(min($v), $decimales),
                'max' => $v === [] ? null : Decimal::versTexte(max($v), $decimales),
                'moyenne' => $v === [] ? null : Decimal::versTexte(Decimal::diviserArrondi(array_sum($v), count($v)), $decimales),
            ];
        }

        return [
            'moyenne_classe' => $moyenneClasse === null ? null : Decimal::versTexte($moyenneClasse, $decimales),
            'effectif_classe' => count($generales),
            'par_matiere' => $distribution,
            '_moyenne_classe_echelle' => $moyenneClasse,
        ];
    }

    /**
     * Mention depuis l'échelle de l'établissement. Tranches [min, max[ ; la dernière inclut max.
     *
     * @param  list<array{min: string, max: string, mention: string}>  $echelle
     */
    public function mention(int $moyenneEchelle, array $echelle): ?string
    {
        $n = count($echelle);
        foreach (array_values($echelle) as $i => $tranche) {
            $min = Decimal::versEchelle((string) $tranche['min']);
            $max = Decimal::versEchelle((string) $tranche['max']);
            $dansTranche = $moyenneEchelle >= $min && ($moyenneEchelle < $max || ($i === $n - 1 && $moyenneEchelle === $max));
            if ($dansTranche) {
                return $tranche['mention'];
            }
        }

        return null;
    }

    /**
     * Échelle d'appréciation valide : tranches triées, contiguës, couvrant exactement [note_min, note_max].
     * Appelé à l'enregistrement des paramètres, pour qu'aucune moyenne ne tombe "entre deux mentions".
     *
     * @param  list<array{min: mixed, max: mixed, mention: mixed}>  $echelle
     *
     * @throws InvalidArgumentException
     */
    public function validerEchelle(array $echelle, string $noteMin, string $noteMax): void
    {
        if ($echelle === []) {
            throw new InvalidArgumentException("L'échelle d'appréciation doit contenir au moins une tranche.");
        }

        $precedent = Decimal::versEchelle($noteMin);
        foreach (array_values($echelle) as $i => $t) {
            $mention = trim((string) ($t['mention'] ?? ''));
            if ($mention === '' || mb_strlen($mention) > 60) {
                throw new InvalidArgumentException('Tranche '.($i + 1).' : libellé de mention obligatoire (60 caractères maximum).');
            }
            $min = Decimal::versEchelle((string) ($t['min'] ?? ''));
            $max = Decimal::versEchelle((string) ($t['max'] ?? ''));
            if ($min !== $precedent) {
                throw new InvalidArgumentException('Tranche '.($i + 1).' : elle doit commencer exactement où la précédente se termine (tranches triées et contiguës).');
            }
            if ($max <= $min) {
                throw new InvalidArgumentException('Tranche '.($i + 1).' : la borne haute doit être supérieure à la borne basse.');
            }
            $precedent = $max;
        }

        if ($precedent !== Decimal::versEchelle($noteMax)) {
            throw new InvalidArgumentException("La dernière tranche doit se terminer à la note maximale de la grille ({$noteMax}).");
        }
    }

    /**
     * Contrôle d'une valeur saisie contre le barème de l'épreuve (0 à note_sur, 2 décimales maximum).
     *
     * @throws InvalidArgumentException
     */
    public function validerValeur(string $valeur, string $noteSur): void
    {
        if (! preg_match('/^\d{1,3}(\.\d{1,2})?$/', $valeur)) {
            throw new InvalidArgumentException('La note doit être un nombre positif avec au plus 2 décimales.');
        }
        if (Decimal::versEchelle($valeur) > Decimal::versEchelle($noteSur)) {
            throw new InvalidArgumentException("La note ne peut pas dépasser le barème de l'épreuve ({$noteSur}).");
        }
    }

    // ------------------------------------------------------------------------------------------

    /**
     * Notes effectivement prises en compte, ramenées sur la grille, après règles d'absence,
     * de note manquante et de rattrapage.
     *
     * @return array<string, array{matiere_uuid: string, type: string, valeur: int, coef_evaluation: int}>
     */
    private function notesRetenues(array $evaluations, array $regles): array
    {
        $noteMax = Decimal::versEchelle($regles['note_max']);
        $valeurs = [];
        $rattrapages = [];

        foreach ($evaluations as $ev) {
            $valeur = $this->valeurEffective($ev, $regles, $noteMax);

            if ($ev['rattrapage_de'] !== null) {
                // Un rattrapage n'est jamais compté seul : il ne sert qu'à corriger l'épreuve d'origine,
                // et seulement s'il a réellement été passé (note saisie).
                if (($ev['note']['statut'] ?? null) === 'saisie') {
                    $rattrapages[$ev['rattrapage_de']] = $valeur;
                }

                continue;
            }

            $valeurs[$ev['evaluation_uuid']] = [
                'matiere_uuid' => $ev['matiere_uuid'],
                'type' => $ev['type'],
                'valeur' => $valeur,
                'coef_evaluation' => $this->coefCentiemes($ev['coef_evaluation']),
            ];
        }

        foreach ($rattrapages as $origine => $r) {
            if (! array_key_exists($origine, $valeurs)) {
                continue; // épreuve d'origine absente de la période : rattrapage ignoré
            }
            $initiale = $valeurs[$origine]['valeur'];
            $valeurs[$origine]['valeur'] = match (true) {
                $initiale === null => $r,
                $regles['regle_rattrapage'] === 'remplacer' => $r,
                $regles['regle_rattrapage'] === 'meilleure' => max($initiale, $r),
                default => Decimal::diviserArrondi($initiale + $r, 2),
            };
        }

        return array_filter($valeurs, fn ($v) => $v['valeur'] !== null);
    }

    /**
     * Moyenne d'une matière à partir de ses notes retenues.
     *  - type en mode "bloc" (ex. interrogations) : moyenne de ses notes (pondérée par le coefficient
     *    de chaque épreuve), qui compte ensuite comme UNE note de poids `poids` ;
     *  - type en mode "individuel" (ex. devoirs) : chaque note compte, poids = `poids` × coef de l'épreuve.
     *
     * @return array{0: ?int, 1: array<string, int>} [moyenne, moyennes des blocs par type]
     */
    private function moyenneMatiere(array $retenues, array $ponderation): array
    {
        $blocs = [];
        $num = 0;
        $den = 0;

        foreach ($retenues as $r) {
            $regle = $ponderation[$r['type']] ?? ['mode' => 'individuel', 'poids' => '1'];
            if ($regle['mode'] === 'bloc') {
                $blocs[$r['type']]['num'] = ($blocs[$r['type']]['num'] ?? 0) + $r['valeur'] * $r['coef_evaluation'];
                $blocs[$r['type']]['den'] = ($blocs[$r['type']]['den'] ?? 0) + $r['coef_evaluation'];

                continue;
            }
            // Poids à l'échelle 10^4 (centièmes × centièmes), commun aux blocs et aux notes individuelles.
            $poids = $this->coefCentiemes((string) $regle['poids']) * $r['coef_evaluation'];
            $num += $r['valeur'] * $poids;
            $den += $poids;
        }

        $moyennesBlocs = [];
        foreach ($blocs as $type => $b) {
            $moyennesBlocs[$type] = Decimal::diviserArrondi($b['num'], $b['den']);
            $poids = $this->coefCentiemes((string) $ponderation[$type]['poids']) * 100;
            $num += $moyennesBlocs[$type] * $poids;
            $den += $poids;
        }

        return [$den > 0 ? Decimal::diviserArrondi($num, $den) : null, $moyennesBlocs];
    }

    /** Valeur ramenée sur la grille (échelle 10^4), ou null si la note est exclue du calcul. */
    private function valeurEffective(array $ev, array $regles, int $noteMax): ?int
    {
        $note = $ev['note'];

        if ($note === null) {
            return $regles['note_non_saisie'] === 'zero' ? 0 : null;
        }

        return match ($note['statut']) {
            'saisie' => $this->normaliser((string) $note['valeur'], (string) $ev['note_sur'], $noteMax),
            'absent_non_justifie' => $regles['absence_non_justifiee'] === 'zero' ? 0 : null,
            'absent_justifie', 'dispense' => null,
            default => throw new InvalidArgumentException("Statut de note inconnu : {$note['statut']}."),
        };
    }

    /** valeur / note_sur × note_max, exact puis arrondi à 4 décimales internes. */
    private function normaliser(string $valeur, string $noteSur, int $noteMax): int
    {
        $v = Decimal::versEchelle($valeur);
        $sur = Decimal::versEchelle($noteSur);

        if ($sur <= 0 || $v < 0 || $v > $sur) {
            throw new InvalidArgumentException("Note incohérente avec le barème de l'épreuve ({$valeur} / {$noteSur}).");
        }

        return Decimal::diviserArrondi($v * $noteMax, $sur);
    }

    /** Coefficient (2 décimales maximum, > 0) en centièmes : "1.5" => 150. */
    private function coefCentiemes(string|int $coef): int
    {
        $e = Decimal::versEchelle(is_int($coef) ? (string) $coef : $coef);
        if ($e <= 0 || $e % 100 !== 0) {
            throw new InvalidArgumentException("Coefficient invalide : {$coef} (strictement positif, 2 décimales maximum).");
        }

        return intdiv($e, 100);
    }

    private function validerRegles(array $r): array
    {
        $attendus = [
            'note_non_saisie' => ['exclure', 'zero'],
            'absence_non_justifiee' => ['exclure', 'zero'],
            'regle_rattrapage' => ['remplacer', 'meilleure', 'moyenne'],
            'type_notation' => ['chiffree', 'competences'],
        ];
        foreach ($attendus as $cle => $valeurs) {
            if (! in_array($r[$cle] ?? null, $valeurs, true)) {
                throw new InvalidArgumentException("Paramètre de notation invalide : {$cle}.");
            }
        }
        if (! is_int($r['decimales'] ?? null) || $r['decimales'] < 0 || $r['decimales'] > 3) {
            throw new InvalidArgumentException('Paramètre de notation invalide : decimales (0 à 3).');
        }
        if (! isset($r['note_max'], $r['note_min']) || ! is_array($r['echelle_appreciation'] ?? null)) {
            throw new InvalidArgumentException('Paramètres de notation incomplets (bornes de grille, échelle).');
        }
        if (! is_array($r['ponderation_types'] ?? null)) {
            throw new InvalidArgumentException('Paramètre de notation invalide : ponderation_types.');
        }
        foreach ($r['ponderation_types'] as $type => $regle) {
            if (! in_array($regle['mode'] ?? null, ['bloc', 'individuel'], true)) {
                throw new InvalidArgumentException("Pondération invalide pour « {$type} » : mode bloc ou individuel.");
            }
            $this->coefCentiemes((string) ($regle['poids'] ?? ''));
        }
        $r['note_max'] = (string) $r['note_max'];
        $r['note_min'] = (string) $r['note_min'];

        return $r;
    }

    /** Règles rappelées sur le bulletin (CDC §5 : le choix doit être visible et documenté). */
    private function reglesAffichees(array $r): array
    {
        return [
            'ponderation_types' => $r['ponderation_types'],
            'decimales' => $r['decimales'],
            'note_sur' => $r['note_max'],
            'politique_note_manquante' => $r['note_non_saisie'] === 'zero'
                ? 'Notes non saisies comptées comme 0'
                : 'Notes non saisies exclues du calcul',
            'politique_absence' => $r['absence_non_justifiee'] === 'zero'
                ? 'Absences non justifiées comptées comme 0'
                : 'Absences non justifiées exclues du calcul',
            'regle_rattrapage' => $r['regle_rattrapage'],
        ];
    }
}
