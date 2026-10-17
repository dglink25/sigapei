<?php

namespace App\Providers;

use App\Integrations\RabbitMqPublisher;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Seul point de publication d'événements vers RabbitMQ.
        $this->app->singleton(RabbitMqPublisher::class, fn () => new RabbitMqPublisher);
    }

    public function boot(): void
    {
        // Limiteurs déclarés ici (et non dans le callback `then` de withRouting) :
        // ce provider `boot` s'exécute même lorsque les routes sont mises en cache,
        // sinon `throttle:api` retombe sur `$request->user()` et résout le guard `api`.
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(120)->by($r->header('X-User-Id') ?: $r->ip()));
        RateLimiter::for('sensible', fn (Request $r) => Limit::perMinute(10)->by('s:'.($r->header('X-User-Id') ?: $r->ip())));
    }
}
