#!/bin/sh
# Mise en cache de la configuration et des routes au démarrage (variables injectées à l'exécution).
set -e
php artisan config:cache
php artisan route:cache
exec "$@"
