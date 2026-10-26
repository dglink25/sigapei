<?php

namespace Tests;

/**
 * Amorce l'application Laravel pour les tests.
 */
trait CreatesApplication
{
    public function createApplication(): \Illuminate\Foundation\Application
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        return $app;
    }
}
