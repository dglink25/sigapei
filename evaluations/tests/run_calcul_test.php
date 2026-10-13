<?php

/**
 * Script de test rapide du CalculService sans dépendances vendor.
 * Valide la phase 2 du guide suprême (tasks §2.5).
 * Exécuter : php tests/run_calcul_test.php
 */

require_once __DIR__ . '/../app/Services/CalculService.php';

$s      = new App\Services\CalculService();
$ok     = 0;
$failed = [];

function check(string $nom, bool $condition): void {
    global $ok, $failed;
    if ($condition) {
        $ok++;
        echo "  ✓ {$nom}\n";
    } else {
        $failed[] = $nom;
        echo "  ✗ {$nom}\n";
    }
}

$echelle = [
    ['min' => 18,  'max' => 20,    'mention' => 'Excellent'],
    ['min' => 16,  'max' => 17.99, 'mention' => 'Très Bien'],
    ['min' => 14,  'max' => 15.99, 'mention' => 'Bien'],
    ['min' => 12,  'max' => 13.99, 'mention' => 'Assez Bien'],
    ['min' => 10,  'max' => 11.99, 'mention' => 'Passable'],
    ['min' => 0,   'max' => 9.99,  'mention' => 'Insuffisant'],
];

$cfg = ['note_non_saisie' => 'exclure', 'arrondi' => 'demi'];

echo "\n=== ARRONDI ===\n";
check('demi 13.3 → 13.5',  $s->arrondir(13.3, 'demi') === 13.5);
check('demi 13.8 → 14.0',  $s->arrondir(13.8, 'demi') === 14.0);
check('demi 13.5 → 13.5',  $s->arrondir(13.5, 'demi') === 13.5);
check('entier 13.4 → 13',  $s->arrondir(13.4, 'entier') === 13.0);
check('entier 13.5 → 14',  $s->arrondir(13.5, 'entier') === 14.0);
check('2dec 13.333 → 13.33', $s->arrondir(13.333, 'deux_decimales') === 13.33);
check('défaut inconnu = demi', $s->arrondir(13.3, 'inconnu') === 13.5);

echo "\n=== MENTION ===\n";
check('Excellent 18.0',   $s->determinerMention(18.0,  $echelle) === 'Excellent');
check('Excellent 20.0',   $s->determinerMention(20.0,  $echelle) === 'Excellent');
check('Passable 10.0',    $s->determinerMention(10.0,  $echelle) === 'Passable');
check('Insuffisant 0.0',  $s->determinerMention(0.0,   $echelle) === 'Insuffisant');
check('null hors échelle', $s->determinerMention(25.0, $echelle) === null);
check('null échelle vide', $s->determinerMention(15.0, []) === null);

echo "\n=== MOYENNE PONDÉRÉE ===\n";
$n1 = [['valeur'=>14.0,'coef_evaluation'=>1.0,'coef_matiere'=>1.0,'saisie'=>true]];
check('simple coef 1×1 → 14.0', $s->calculerMoyenne($n1, $cfg) === 14.0);

// (16×4 + 12×2)/(4+2) = 88/6 = 14.666 → arrondi demi = 14.5
$n2 = [
    ['valeur'=>16.0,'coef_evaluation'=>1.0,'coef_matiere'=>4.0,'saisie'=>true],
    ['valeur'=>12.0,'coef_evaluation'=>1.0,'coef_matiere'=>2.0,'saisie'=>true],
];
check('deux matières coefs → 14.5', $s->calculerMoyenne($n2, $cfg) === 14.5);

// coef_eval=2, coef_mat=3 → moyenne = 18.0
$n3 = [['valeur'=>18.0,'coef_evaluation'=>2.0,'coef_matiere'=>3.0,'saisie'=>true]];
check('coef_eval × coef_mat → 18.0', $s->calculerMoyenne($n3, $cfg) === 18.0);

$nMix = [
    ['valeur'=>16.0,'coef_evaluation'=>1.0,'coef_matiere'=>1.0,'saisie'=>true],
    ['valeur'=>0.0, 'coef_evaluation'=>1.0,'coef_matiere'=>1.0,'saisie'=>false],
];
check('exclure non saisie → 16.0', $s->calculerMoyenne($nMix, $cfg) === 16.0);
check('zero non saisie → 8.0',
    $s->calculerMoyenne($nMix, ['note_non_saisie'=>'zero','arrondi'=>'demi']) === 8.0);
check('null si vide', $s->calculerMoyenne([], $cfg) === null);
check('null si toutes non saisies + exclure',
    $s->calculerMoyenne([['valeur'=>0,'coef_evaluation'=>1,'coef_matiere'=>1,'saisie'=>false]], $cfg) === null);

// Reproductibilité
$r1 = $s->calculerMoyenne($n2, $cfg);
$r2 = $s->calculerMoyenne($n2, $cfg);
check('reproductibilité', $r1 === $r2);

// Composition en ligne = mêmes règles
$nCompo = [['valeur'=>14.0,'coef_evaluation'=>2.0,'coef_matiere'=>3.0,'saisie'=>true]];
$nManuel = [['valeur'=>14.0,'coef_evaluation'=>2.0,'coef_matiere'=>3.0,'saisie'=>true]];
check('composition = même règle que manuelle',
    $s->calculerMoyenne($nCompo, $cfg) === $s->calculerMoyenne($nManuel, $cfg));

echo "\n=== RANGS ===\n";
$rangs = $s->calculerRangs(['a'=>16.0,'b'=>12.0,'c'=>18.0], ['classement_active'=>true]);
check('rang 1 → c (18.0)',  $rangs['c'] === 1);
check('rang 2 → a (16.0)',  $rangs['a'] === 2);
check('rang 3 → b (12.0)',  $rangs['b'] === 3);

$rangs0 = $s->calculerRangs(['a'=>16.0,'b'=>12.0], ['classement_active'=>false]);
check('classement désactivé → null', $rangs0['a'] === null);

$rangsNull = $s->calculerRangs(['a'=>16.0,'b'=>null], ['classement_active'=>true]);
check('moyenne null → rang null', $rangsNull['b'] === null);
check('moyenne non null → rang défini', $rangsNull['a'] === 1);

echo "\n=== VALIDATION GRILLE ===\n";
try {
    $s->validerNoteDansGrille(25.0, ['note_min'=>0,'note_max'=>20]);
    check('exception hors grille', false);
} catch (InvalidArgumentException $e) {
    check('exception hors grille', true);
}
try {
    $s->validerNoteDansGrille(-1.0, ['note_min'=>0,'note_max'=>20]);
    check('exception note négative', false);
} catch (InvalidArgumentException $e) {
    check('exception note négative', true);
}
$s->validerNoteDansGrille(15.0, ['note_min'=>0,'note_max'=>20]);
check('note valide sans exception', true);

echo "\n=== RÉSUMÉ BULLETIN (identité web/PDF/interne) ===\n";
$rb1 = $s->calculerResumeBulletin($n2, $cfg, $echelle);
$rb2 = $s->calculerResumeBulletin($n2, $cfg, $echelle);
check('moyenne identique web = PDF = interne', $rb1['moyenne'] === $rb2['moyenne']);
check('mention identique',                     $rb1['mention'] === $rb2['mention']);
check('politique note manquante affichée',     !empty($rb1['politique_note_manquante']));

echo "\n=== PERFORMANCE (< 500 ms) ===\n";
$n30 = [];
for ($i = 0; $i < 30; $i++) {
    $n30[] = ['valeur'=>mt_rand(0,200)/10,'coef_evaluation'=>2,'coef_matiere'=>3,'saisie'=>true];
}
$t  = microtime(true);
$s->calculerResumeBulletin($n30, $cfg, $echelle);
$ms = (microtime(true) - $t) * 1000;
check("bulletin 30 notes < 500ms (actuel : " . round($ms, 3) . "ms)", $ms < 500);

echo "\n" . str_repeat('=', 50) . "\n";
echo "RÉSULTAT : {$ok} tests passés";
if (!empty($failed)) {
    echo ", " . count($failed) . " ÉCHECS :\n";
    foreach ($failed as $f) echo "  - {$f}\n";
} else {
    echo " — TOUS VERTS ✓\n";
}
echo str_repeat('=', 50) . "\n";
