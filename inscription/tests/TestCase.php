<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

/**
 * Classe de base des tests d'intégration du microservice Scolarité.
 *
 * Les tests n'utilisent pas la base Neon : ils s'appuient sur Http::fake()
 * pour isoler les microservices distants, et sur le conteneur Laravel pour
 * le routage et la résolution de services.
 */
abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
}
