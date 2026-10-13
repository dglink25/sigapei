<?php

namespace App\Services;

/**
 * Moteur UNIQUE de calcul — guide suprême §00 règle 2 + design §2.1 + tasks §2.1-2.4.
 *
 * Principes NON NÉGOCIABLES :
 * - Déterministe, sans effet de bord, sans lecture de mise en forme.
 * - Consommé identiquement par l'API web, le PDF et les endpoints internes.
 * - Aucun barème, coefficient, échelle, arrondi codé en dur.
 * - Une note issue d'une composition en ligne suit exactement les mêmes règles.
 *
 * Formule (guide design §2.1, littérale de la source §5) :
 *   moyenne = Σ(note × coef_évaluation × coef_matière) / Σ(coef_évaluation × coef_matière)
 *
 * NOTE sur DECISION-04 : le dénominateur est interprété comme
 * Σ(coef_évaluation × coef_matière), ce qui est la seule formulation cohérente
 * avec une moyenne pondérée standard. Cette implémentation est documentée
 * et doit être validée avec le chef de projet.
 *
 * @priority ABSOLUE — tests unitaires 100 % (guide tasks §2.5)
 */
class CalculService
{
    // -------------------------------------------------------------------------
    // 2.1 — Moyenne pondérée
    // -------------------------------------------------------------------------

    /**
     * Calcule la moyenne pondérée d'un apprenant sur une période.
     *
     * @param array $notes  Liste des notes à agréger.
     *   Chaque élément : [
     *     'valeur'          => float,   // note saisie
     *     'coef_evaluation' => float,   // coefficient de l'évaluation
     *     'coef_matiere'    => float,   // coefficient_defaut de la matière
     *     'saisie'          => bool,    // false = note non saisie
     *   ]
     * @param array $config
     *   'note_non_saisie' => 'exclure' | 'zero'  (requirements §5.5)
     *   'arrondi'         => 'demi' | 'entier' | 'deux_decimales'
     *   'rattrapage'      => null | ['note_originale' => float, 'note_rattrapage' => float, 'regle' => 'max'|'moyenne']
     *
     * @return float|null  null si aucune note applicable
     */
    public function calculerMoyenne(array $notes, array $config): ?float
    {
        $noteNonSaisie = $config['note_non_saisie'] ?? 'exclure';
        $arrondi       = $config['arrondi'] ?? 'demi';

        $numerateur   = 0.0;
        $denominateur = 0.0;

        foreach ($notes as $note) {
            if (!($note['saisie'] ?? true)) {
                if ($noteNonSaisie === 'zero') {
                    $valeur = 0.0;
                } else {
                    // 'exclure' : ne pas inclure dans le calcul
                    continue;
                }
            } else {
                // Règle de rattrapage uniquement sur une note réellement saisie
                $valeur = $this->appliquerRattrapage((float) $note['valeur'], $note, $config);
            }

            $poids         = ($note['coef_evaluation'] ?? 1.0) * ($note['coef_matiere'] ?? 1.0);
            $numerateur   += $valeur * $poids;
            $denominateur += $poids;
        }

        if ($denominateur == 0.0) {
            return null;
        }

        $moyenne = $numerateur / $denominateur;

        return $this->arrondir($moyenne, $arrondi);
    }

    /**
     * Applique la règle de substitution pour le rattrapage (requirements §5.6, DECISION-13).
     * Par défaut : maximum entre note originale et rattrapage.
     */
    private function appliquerRattrapage(float $valeur, array $note, array $config): float
    {
        if (!isset($config['rattrapage'][$note['evaluation_uuid'] ?? ''])) {
            return $valeur;
        }

        $r     = $config['rattrapage'][$note['evaluation_uuid']];
        $regle = $r['regle'] ?? 'max';

        return match ($regle) {
            'moyenne' => ($valeur + $r['note_rattrapage']) / 2,
            default   => max($valeur, $r['note_rattrapage']), // 'max'
        };
    }

    // -------------------------------------------------------------------------
    // 2.2 — Rangs, moyenne de classe, distribution (requirements §8)
    // -------------------------------------------------------------------------

    /**
     * Calcule les rangs de tous les apprenants d'une classe.
     * Guide requirements §8.1 : calculé sur la MÊME moyenne que le bulletin.
     * requirements §8.4 : respecte la désactivation du classement.
     *
     * Départage des ex æquo (DECISION-13) : par ordre d'insertion (stable sort).
     * À valider avec le chef de projet.
     *
     * @param array $moyennes  ['apprenant_uuid' => float|null, ...]
     * @param array $config    ['classement_active' => bool]
     * @return array           ['apprenant_uuid' => int|null, ...]
     */
    public function calculerRangs(array $moyennes, array $config): array
    {
        if (!($config['classement_active'] ?? true)) {
            // Classement désactivé — aucun rang exposé (requirements §8.4)
            return array_map(fn () => null, $moyennes);
        }

        // Filtrer les nulls
        $valides = array_filter($moyennes, fn ($m) => $m !== null);

        // Tri décroissant (stable : arsort préserve l'ordre d'insertion pour les ex æquo)
        arsort($valides);

        $rangs = [];
        $rang  = 1;
        foreach ($valides as $uuid => $moyenne) {
            $rangs[$uuid] = $rang++;
        }

        // Apprenants sans moyenne = pas de rang
        foreach ($moyennes as $uuid => $moyenne) {
            if (!isset($rangs[$uuid])) {
                $rangs[$uuid] = null;
            }
        }

        return $rangs;
    }

    /**
     * Calcule la moyenne de classe et la distribution min/max/moy par matière.
     * Guide requirements §8.2 + §8.3.
     *
     * @param array $notesByApprenant
     *   [apprenant_uuid => [['matiere_uuid' => string, 'valeur' => float, 'saisie' => bool], ...], ...]
     * @param array $config  ['note_non_saisie' => 'exclure'|'zero']
     * @return array [
     *   'moyenne_classe'  => float|null,
     *   'par_matiere'     => ['matiere_uuid' => ['min' => float, 'max' => float, 'moyenne' => float]],
     *   'nb_apprenants'   => int,
     * ]
     */
    public function calculerStatistiquesClasse(array $notesByApprenant, array $config = []): array
    {
        $noteNonSaisie   = $config['note_non_saisie'] ?? 'exclure';
        $notesByMatiere  = [];
        $moyennesClasse  = [];

        foreach ($notesByApprenant as $apprenantUuid => $notes) {
            foreach ($notes as $note) {
                if (!($note['saisie'] ?? true)) {
                    if ($noteNonSaisie === 'zero') {
                        $note['valeur'] = 0.0;
                    } else {
                        continue;
                    }
                }
                $notesByMatiere[$note['matiere_uuid']][] = $note['valeur'];
            }
        }

        // Distribution par matière
        $parMatiere = [];
        foreach ($notesByMatiere as $matiereUuid => $valeurs) {
            if (empty($valeurs)) {
                continue;
            }
            $parMatiere[$matiereUuid] = [
                'min'     => min($valeurs),
                'max'     => max($valeurs),
                'moyenne' => array_sum($valeurs) / count($valeurs),
            ];
        }

        // Moyenne de classe = moyenne des moyennes individuelles
        foreach ($notesByApprenant as $apprenantUuid => $notes) {
            $moyenneIndiv = $this->calculerMoyenne($notes, $config);
            if ($moyenneIndiv !== null) {
                $moyennesClasse[] = $moyenneIndiv;
            }
        }

        $moyenneClasse = !empty($moyennesClasse)
            ? array_sum($moyennesClasse) / count($moyennesClasse)
            : null;

        return [
            'moyenne_classe' => $moyenneClasse !== null
                ? $this->arrondir($moyenneClasse, $config['arrondi'] ?? 'demi')
                : null,
            'par_matiere'   => $parMatiere,
            'nb_apprenants' => count($moyennesClasse),
        ];
    }

    // -------------------------------------------------------------------------
    // 2.3 — Mention depuis l'échelle d'appréciation du tenant (requirements §5, §6)
    // -------------------------------------------------------------------------

    /**
     * Détermine la mention depuis l'échelle du tenant.
     * Jamais codée en dur — lue depuis modele_bulletin.echelle_appreciation.
     *
     * @param float $moyenne
     * @param array $echelle  [['min' => float, 'max' => float, 'mention' => string], ...]
     * @return string|null
     */
    public function determinerMention(float $moyenne, array $echelle): ?string
    {
        foreach ($echelle as $tranche) {
            if ($moyenne >= (float) $tranche['min'] && $moyenne <= (float) $tranche['max']) {
                return $tranche['mention'];
            }
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // 2.4 — Support des cycles via grille (requirements §6.4-6.6)
    // -------------------------------------------------------------------------

    /**
     * Valide qu'une note est dans la plage autorisée par la grille du tenant.
     * La note max est définie par grille (ex : 20 pour béninois, 10 pour primaire béninois).
     *
     * @param float $valeur
     * @param array $grille  ['note_min' => float, 'note_max' => float]
     * @throws \InvalidArgumentException si hors plage
     */
    public function validerNoteDansGrille(float $valeur, array $grille): void
    {
        $min = (float) ($grille['note_min'] ?? 0);
        $max = (float) ($grille['note_max'] ?? 20);

        if ($valeur < $min || $valeur > $max) {
            throw new \InvalidArgumentException(
                "La note {$valeur} est hors de la plage autorisée ({$min} – {$max}) pour cette grille."
            );
        }
    }

    /**
     * Construit le résumé complet d'un bulletin individuel.
     * Appelé identiquement par l'API web, la génération PDF et l'endpoint interne.
     * Guide design §2.1 : "Déterministe, sans effet de bord."
     *
     * @param array $notes    Notes de l'apprenant sur la période
     * @param array $config   Paramètres du tenant (arrondi, note_non_saisie, etc.)
     * @param array $echelle  Échelle d'appréciation depuis modele_bulletin
     * @return array [
     *   'moyenne'               => float|null,
     *   'mention'               => string|null,
     *   'politique_note_manquante' => string,  // affiché dans le bulletin (requirements §5.5)
     * ]
     */
    public function calculerResumeBulletin(array $notes, array $config, array $echelle): array
    {
        $moyenne = $this->calculerMoyenne($notes, $config);

        return [
            'moyenne'                  => $moyenne,
            'mention'                  => $moyenne !== null
                ? $this->determinerMention($moyenne, $echelle)
                : null,
            // Requirements §5.5 : ce choix DOIT être visible dans le bulletin généré
            'politique_note_manquante' => ($config['note_non_saisie'] ?? 'exclure') === 'zero'
                ? 'Notes non saisies comptées comme 0'
                : 'Notes non saisies exclues du calcul',
        ];
    }

    // -------------------------------------------------------------------------
    // Arrondi paramétrable (requirements §5.4)
    // -------------------------------------------------------------------------

    /**
     * @param float  $valeur
     * @param string $regle  'demi' | 'entier' | 'deux_decimales'
     */
    public function arrondir(float $valeur, string $regle): float
    {
        return match ($regle) {
            'entier'          => (float) round($valeur),
            'deux_decimales'  => round($valeur, 2),
            default           => round($valeur * 2) / 2, // demi (ex : 13.3 → 13.5)
        };
    }
}
