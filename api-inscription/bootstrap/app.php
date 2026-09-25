<?php

$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);

$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\common\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\common\ConsoleKernel::class
);

$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\common\ExceptionHandler::class
);

return $app;
