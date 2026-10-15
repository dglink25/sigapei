# ============================================================
# vie-scolaire - Dockerfile multi-stage
# Image finale legere (php:8.3-fpm-alpine), microservice Laravel 12
# Sert en local ET en environnement partage (meme image).
# ============================================================

# --- Etape 1 : assets front (welcome.blade.php utilise @vite) ---
# Sans cette etape, la route `/` leve une ViteManifestNotFoundException.
FROM node:22-alpine AS assets
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run build

# --- Etape 2 : dependances Composer (sans dev) ---
FROM composer:2 AS vendor
WORKDIR /app

COPY composer.json composer.lock ./
COPY artisan ./
COPY bootstrap ./bootstrap
COPY config ./config
COPY app ./app
COPY database ./database
COPY routes ./routes
COPY resources ./resources

# package:discover a besoin de bootstrap/cache, dont le contenu est
# ignore par git : on le recree avant composer install.
RUN mkdir -p bootstrap/cache \
    && composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --ignore-platform-reqs \
        --no-scripts \
    && composer dump-autoload --no-dev --optimize --no-scripts \
    && php artisan package:discover --ansi

# --- Etape 3 : image finale d'execution ---
FROM php:8.3-fpm-alpine AS runtime
WORKDIR /var/www/html

# postgresql-dev fournit pg_config et les en-tetes libpq : sans lui,
# `docker-php-ext-install pdo_pgsql` echoue a la compilation.
# openssl est requis pour le TLS vers Neon (DB_SSLMODE=require).
RUN apk add --no-cache \
        bash \
        curl \
        postgresql16-client \
        libpq \
        icu-libs \
        libzip \
        nodejs \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        postgresql-dev \
        icu-dev \
        libzip-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        intl \
        zip \
        bcmath \
        opcache \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build
COPY . .

RUN mkdir -p storage/framework/cache/data \
             storage/framework/sessions \
             storage/framework/views \
             storage/logs \
             bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x docker/entrypoint.sh

USER www-data

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:9000/up || exit 1

ENTRYPOINT ["docker/entrypoint.sh"]
