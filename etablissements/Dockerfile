# ============================================================
# api-etablissements - Dockerfile (PHP 8.3 CLI, Laravel 11)
# Microservice ecoute sur le port 4002
# ============================================================
FROM php:8.3-cli-alpine

RUN apk add --no-cache \
        postgresql-dev \
        libzip-dev \
        oniguruma-dev \
        icu-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_pgsql pgsql bcmath zip intl sockets \
    && apk del $PHPIZE_DEPS

# Client Redis pur PHP (predis) : pas besoin de l'extension C phpredis.

WORKDIR /app

COPY composer.json ./
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# L'installation reelle des dependances (composer install) se fait au build,
# necessite un acces reseau (voir README.md) : Composer telecharge le
# framework Laravel et les paquets listes dans composer.json.
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader || true

COPY . .

RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader \
    && php artisan config:clear

RUN addgroup -S sigapei && adduser -S sigapei -G sigapei \
    && chown -R sigapei:sigapei /app storage bootstrap/cache 2>/dev/null || true

USER sigapei

EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD php -r "exit(@file_get_contents('http://127.0.0.1:4002/sante') ? 0 : 1);"

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=4002"]
