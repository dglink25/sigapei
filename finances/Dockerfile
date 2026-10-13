# ============================================================
# api-finances — Dockerfile en deux étapes (CDC Finances)
# Image de base : php:8.4-fpm-alpine ; extensions : pdo_pgsql, redis, amqp
# Port interne : 4008 (non publié sur l'hôte, voir docker-compose.yml)
# ============================================================

# --- Étape 1 : build Composer ---
FROM php:8.4-fpm-alpine AS build

RUN apk add --no-cache libpq libzip icu-libs \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev libzip-dev icu-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql bcmath zip intl sockets \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
# --no-scripts : "artisan package:discover" (post-autoload-dump) échouerait ici, artisan n'est pas encore copié.
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader --no-scripts

# --- Étape 2 : image d'exécution allégée (bibliothèques runtime uniquement, pas de paquets -dev) ---
FROM php:8.4-fpm-alpine AS runtime

RUN apk add --no-cache libpq libzip icu-libs rabbitmq-c \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev libzip-dev icu-dev oniguruma-dev rabbitmq-c-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql bcmath zip intl sockets \
    && pecl install redis amqp \
    && docker-php-ext-enable redis amqp \
    && apk del .build-deps

WORKDIR /app

COPY --from=build /app/vendor ./vendor
COPY . .

# Répertoires inscriptibles requis par Laravel, puis découverte des paquets (différée depuis l'étape 1).
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi

RUN addgroup -S sigapei && adduser -S sigapei -G sigapei \
    && chown -R sigapei:sigapei /app/storage /app/bootstrap/cache

USER sigapei

EXPOSE 4008

# Healthcheck HTTP /sante (CDC Finances) — consommé par l'orchestrateur.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD php -r "exit(@file_get_contents(\"http://127.0.0.1:4008/sante\") ? 0 : 1);"

# DECISION à trancher : "artisan serve" est le serveur de développement de Laravel ; le CDC impose php-fpm
# mais ne nomme aucun serveur web (nginx ?). Laissé tel quel en attendant la décision.
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=4008"]
