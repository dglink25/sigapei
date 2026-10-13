<?php

namespace App\Providers;

use App\Integrations\RabbitMqPublisher;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Seul point de publication d'événements vers RabbitMQ (CDC §14.2).
        $this->app->singleton(RabbitMqPublisher::class, fn () => new RabbitMqPublisher());
    }

    public function boot(): void
    {
    }
}
