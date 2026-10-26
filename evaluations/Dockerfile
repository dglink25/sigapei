# ============================================================
# api-evaluations - image de production en deux étapes
# PHP 8.4 (le composer.lock est résolu pour PHP >= 8.4.1), extensions pdo_pgsql, redis, amqp, bcmath
# Serveur : nginx + php-fpm (supervisord). Port interne 4006 (non publié, voir docker-compose.yml)
# La même image sert l'API, le worker de file et le planificateur (commande différente).
# ============================================================

# --- Étape 1 : dépendances Composer ---
FROM php:8.4-fpm-alpine AS build

RUN apk add --no-cache libpq libzip icu-libs \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev libzip-dev icu-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql bcmath zip intl sockets \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader --no-scripts

# --- Étape 2 : exécution ---
FROM php:8.4-fpm-alpine AS runtime

RUN apk add --no-cache libpq libzip icu-libs rabbitmq-c nginx supervisor \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS postgresql-dev libzip-dev icu-dev oniguruma-dev rabbitmq-c-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql bcmath zip intl sockets opcache \
    && pecl install redis amqp \
    && docker-php-ext-enable redis amqp \
    && apk del .build-deps \
    && rm -rf /tmp/pear

WORKDIR /app

COPY docker/php.ini /usr/local/etc/php/conf.d/zz-sigapei.ini
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/nginx.conf /etc/nginx/sigapei.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN sed -i 's/__PORT__/4006/' /etc/nginx/sigapei.conf \
    && sed -i 's/^listen = .*/listen = 127.0.0.1:9000/' /usr/local/etc/php-fpm.d/www.conf \
    && chmod +x /usr/local/bin/entrypoint

COPY --from=build /app/vendor ./vendor
COPY . .

RUN rm -rf docker tests phpunit.xml .env* \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi \
    && addgroup -S sigapei && adduser -S sigapei -G sigapei \
    && chown -R sigapei:sigapei /app/storage /app/bootstrap/cache /var/lib/nginx /var/log/nginx

USER sigapei

EXPOSE 4006

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD php -r "exit(@file_get_contents('http://127.0.0.1:4006/health') ? 0 : 1);"

ENTRYPOINT ["entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
