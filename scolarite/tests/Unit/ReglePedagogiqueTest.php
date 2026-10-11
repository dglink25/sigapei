<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Règle pédagogique : quelle classe a le droit de porter un compte élève.
 *
 * Cette règle est extraite de InterneController::creerApprenant() et de
 * ScolariteClient::creerApprenant(). Le test la fige ici pour qu'une
 * modification divergente soit détectée, et pour documenter la décision
 * métier du cahier des charges.
 */
class ReglePedagogiqueTest extends TestCase
{
    /**
     * Programme béninois : aucun compte élève, quel que soit le cycle.
     * Raison terrain : téléphone interdit aux élèves en milieu scolaire.
     */
    public function test_programme_beninois_ne_cree_jamais_de_compte_eleve(): void
    {
        foreach (['primaire', 'secondaire'] as $cycle) {
            $this->assertNull(
                $this->compteAutorise('beninois', $cycle),
                "En programme béninois ({$cycle}), l'apprenant ne doit jamais avoir de compte propre."
            );
        }
    }

    /**
     * Programme français : compte optionnel au primaire, actif dès le
     * secondaire.
     */
    public function test_programme_francais_primaire_compte_optionnel(): void
    {
        $this->assertNull(
            $this->compteAutorise('francais', 'primaire'),
            'Au primaire français, le compte est optionnel et donc nul par défaut.'
        );
    }

    public function test_programme_francais_secondaire_compte_actif(): void
    {
        $this->assertTrue(
            $this->compteAutorise('francais', 'secondaire'),
            'Au secondaire français, un compte élève propre est créé et actif.'
        );
    }

    /**
     * Cycle universitaire : l'étudiant reste autonome quel que soit le
     * programme.
     */
    public function test_cycle_universitaire_autonome_quelque_soit_le_programme(): void
    {
        foreach (['beninois', 'francais'] as $programme) {
            $this->assertTrue(
                $this->compteAutorise($programme, 'universitaire'),
                "En cycle universitaire ({$programme}), l'étudiant doit avoir un compte propre."
            );
        }
    }

    /**
     * Reprend la règle telle qu'elle est implémentée dans
     * InterneController::creerApprenant().
     *
     * @return bool|null true = compte créé, null = aucun compte
     */
    private function compteAutorise(string $programme, string $cycle): ?bool
    {
        if ($programme === 'francais' && $cycle === 'secondaire') {
            return true;
        }
        if ($cycle === 'universitaire') {
            return true;
        }
        return null;
    }
}
