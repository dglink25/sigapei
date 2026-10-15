<?php

use Illuminate\Support\Facades\Facade;

return [
    'name' => env('APP_NAME', 'api-scolarite'),
    'env' => env('APP_ENV', 'production'),

    // Compatibilité temporaire entre les deux conventions de tenant en usage
    // sur la plateforme : vie-scolaire impose un X-Tenant-Id numérique, le
    // JWT Identité porte un tenantId en uuid. Lorsque true, un tenant déjà
    // numérique est accepté sans appel au microservice Établissements.
    // À retirer dès que la plateforme a tranché une convention unique.
    'two_tenant_conventions_enabled' => (bool) env('TWO_TENANT_CONVENTIONS_ENABLED', false),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost:4004'),
    'timezone' => 'UTC',
    'locale' => 'fr',
    'fallback_locale' => 'en',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',

    'providers' => [
        Illuminate\Auth\AuthServiceProvider::class,
        Illuminate\Broadcasting\BroadcastServiceProvider::class,
        Illuminate\Bus\BusServiceProvider::class,
        Illuminate\Cache\CacheServiceProvider::class,
        Illuminate\Foundation\Providers\ConsoleSupportServiceProvider::class,
        Illuminate\Cookie\CookieServiceProvider::class,
        Illuminate\Database\DatabaseServiceProvider::class,
        Illuminate\Encryption\EncryptionServiceProvider::class,
        Illuminate\Filesystem\FilesystemServiceProvider::class,
        Illuminate\Foundation\Providers\FoundationServiceProvider::class,
        Illuminate\Hashing\HashServiceProvider::class,
        Illuminate\Mail\MailServiceProvider::class,
        Illuminate\Notifications\NotificationServiceProvider::class,
        Illuminate\Pagination\PaginationServiceProvider::class,
        Illuminate\Pipeline\PipelineServiceProvider::class,
        Illuminate\Queue\QueueServiceProvider::class,
        Illuminate\Redis\RedisServiceProvider::class,
        Illuminate\Auth\Passwords\PasswordResetServiceProvider::class,
        Illuminate\Session\SessionServiceProvider::class,
        Illuminate\Translation\TranslationServiceProvider::class,
        Illuminate\Validation\ValidationServiceProvider::class,
        Illuminate\View\ViewServiceProvider::class,
        App\common\Providers\NeonServiceProvider::class,
        App\common\Providers\RouteServiceProvider::class,
    ],

    'aliases' => Facade::defaultAliases()->toArray(),
];
