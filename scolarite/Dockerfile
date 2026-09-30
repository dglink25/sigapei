FROM php:8.2-cli-alpine

WORKDIR /var/www/html

# Dependances systeme et extensions PHP (PostgreSQL, zip, pdo_pgsql)
RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-install pdo pdo_pgsql zip bcmath

# Installer Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copier le code du microservice
COPY . /var/www/html

# Installer les dependances Composer
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist

# Permissions storage et bootstrap/cache
RUN mkdir -p /var/www/html/storage/framework/views \
    /var/www/html/storage/framework/cache \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/logs \
    /var/www/html/bootstrap/cache \
    && chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD php -r "exit(@file_get_contents('http://127.0.0.1:4004/sante') ? 0 : 1);"

# Utiliser public/index.php comme routeur pour rediriger toutes les URLs vers l'application (pas de 404)
CMD ["php", "-S", "0.0.0.0:4004", "-t", "public", "public/index.php"]
