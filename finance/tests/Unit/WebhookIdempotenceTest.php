<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires de l'idempotence des webhooks.
 * CDC §7.1 + guide : "priorité absolue" pour les tests finances.
 * Une notification webhook dupliquée ne doit jamais créer deux transactions.
 *
 * TODO : implémenter après création du service d'encaissement.
 */
class WebhookIdempotenceTest extends TestCase
{
    public function test_webhook_fedapay_idempotent(): void
    {
        $this->markTestIncomplete('TODO : implémenter avec le service encaissement.');
    }

    public function test_webhook_kkiapay_idempotent(): void
    {
        $this->markTestIncomplete('TODO : implémenter avec le service encaissement.');
    }

    public function test_separations_des_taches_decaissement(): void
    {
        $this->markTestIncomplete('TODO : initiateur != validateur obligatoire.');
    }
}
