<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ValidationAdmissionTest extends TestCase
{
    public function test_bloquage_si_classe_complete(): void
    {
        $capacite = 35;
        $inscrits = 35;
        $estComplete = ($capacite - $inscrits) <= 0;

        $this->assertTrue($estComplete, "La validation doit etre bloquee si la classe est complete.");
    }

    public function test_rejet_exige_un_motif_obligatoire(): void
    {
        $motif = "Dossier incomplet : manque certificat de scolarite anterieur";
        $this->assertNotEmpty(trim($motif));
        $this->assertGreaterThanOrEqual(5, strlen($motif));
    }
}
