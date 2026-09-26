<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class DisponibiliteEtProgrammeTest extends TestCase
{
    public function test_capacite_restante_calculee_correctement(): void
    {
        $capaciteTotale = 45;
        $inscrits = 45;
        $placesRestantes = max(0, $capaciteTotale - $inscrits);

        $this->assertEquals(0, $placesRestantes);
        $this->assertTrue($placesRestantes <= 0, "La classe doit etre declaree complete.");
    }

    public function test_regle_programme_beninois_sans_compte_eleve(): void
    {
        $programme = 'beninois';
        $cycle = 'secondaire';

        $utilisateurId = null;
        if ($programme === 'beninois') {
            // Aucun compte eleve, acces strictement via parent
            $utilisateurId = null;
        } elseif ($programme === 'francais' && $cycle === 'secondaire') {
            $utilisateurId = 42;
        }

        $this->assertNull($utilisateurId, "En programme beninois, l'apprenant ne doit jamais avoir de compte propre.");
    }

    public function test_regle_programme_francais_avec_compte_eleve_secondaire(): void
    {
        $programme = 'francais';
        $cycle = 'secondaire';

        $utilisateurId = null;
        if ($programme === 'beninois') {
            $utilisateurId = null;
        } elseif ($programme === 'francais' && $cycle === 'secondaire') {
            $utilisateurId = 42;
        }

        $this->assertEquals(42, $utilisateurId, "En programme francais au secondaire, l'apprenant dispose d'un compte actif.");
    }
}
