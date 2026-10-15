<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Pas de simulation de la sortie console (évite la dépendance à Mockery). */
    public $mockConsoleOutput = false;

    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();

        return $app;
    }
}
