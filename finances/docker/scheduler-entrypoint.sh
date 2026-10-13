#!/bin/sh
while true; do
  php /app/artisan schedule:run --no-interaction
  sleep 60
done
